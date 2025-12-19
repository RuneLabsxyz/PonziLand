// Midgard POC Game State
// Implements yellow paper economics with time-based burn/inflation

import type {
  Land,
  LandWithFactory,
  Factory,
  ChallengeResult,
  ChallengeRecord,
  ClosedFactoryRecord,
  ChartDataPoint,
  TokenEvent,
  TokenSupplySnapshot,
} from './types';
import { hasFactory } from './types';
import {
  INITIAL_TYCOON_BALANCE,
  INITIAL_CHALLENGER_BALANCE,
  INITIAL_LANDS,
  TICK_INTERVAL_MS,
  BASE_TIME_PER_REAL_SECOND,
  LOSS_BURN_REDUCTION,
  GRID_SIZE,
  BASE_TIME,
} from './constants';
import {
  calculateBurn,
  calculateInflation,
  calculateEffectiveBurn,
  calculateAvailableInflation,
  calculateTicketCost,
  canChallenge,
  calculateWinReward,
  playGame,
  getNeighborCount,
  calculateStakeBurnRate,
  calculatePredictedNetResult,
} from './formulas';

export class MidgardGameStore {
  // Reactive state using Svelte 5 runes
  public lands = $state<Land[]>(structuredClone(INITIAL_LANDS));
  public isPlaying = $state<boolean>(false);
  public timeSpeed = $state<number>(1);
  public selectedLandId = $state<number | null>(null);

  // Simulation time in game seconds
  public simulationTime = $state<number>(0);

  // Tokenomics: Player balances
  public tycoonBalance = $state<number>(INITIAL_TYCOON_BALANCE);
  public challengerBalance = $state<number>(INITIAL_CHALLENGER_BALANCE);

  // Tokenomics: Vault and burn tracking
  public vaultBalance = $state<number>(0); // Locked in factories
  public burnBalance = $state<number>(0); // Accumulated burns

  // Tokenomics: Mint and burn totals
  public totalMinted = $state<number>(0); // All inflation paid out
  public totalBurned = $state<number>(0); // All tokens burned

  // Tokenomics: Event history
  public tokenEvents = $state<TokenEvent[]>([]);

  // Tokenomics: Supply history for charts
  public supplyHistory = $state<TokenSupplySnapshot[]>([]);

  // Last factory creation result
  public lastFactoryResult = $state<{ score: number } | null>(null);

  // Last challenge result
  public lastChallengeResult = $state<ChallengeResult | null>(null);

  // Chart data history
  public chartHistory = $state<ChartDataPoint[]>([]);

  // Challenge history for table display
  public challengeHistory = $state<ChallengeRecord[]>([]);

  // Closed factory history for table display
  public closedFactoryHistory = $state<ClosedFactoryRecord[]>([]);

  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private lastRealTime: number = 0;

  constructor() {}

  // Tokenomics: Computed properties
  public get startingSupply(): number {
    return INITIAL_TYCOON_BALANCE + INITIAL_CHALLENGER_BALANCE;
  }

  public get totalSupply(): number {
    return this.startingSupply + this.totalMinted - this.totalBurned;
  }

  public get circulatingSupply(): number {
    return this.tycoonBalance + this.challengerBalance;
  }

  public get netInflation(): number {
    return this.totalMinted - this.totalBurned;
  }

  // Get selected land (derived-like getter)
  public get selectedLand(): Land | null {
    if (this.selectedLandId === null) return null;
    return this.lands.find((l) => l.id === this.selectedLandId) ?? null;
  }

  // Get factory stats for a land (computed on demand using yellow paper formulas)
  public getFactoryStats(land: Land) {
    if (!hasFactory(land)) return null;

    const factory = land.factory;
    const elapsed = this.simulationTime - factory.createdAt;

    const burn = calculateBurn(elapsed);
    const inflation = calculateInflation(elapsed);
    const effectiveBurn = calculateEffectiveBurn(
      elapsed,
      factory.burnReductions,
    );
    const availableInflation = calculateAvailableInflation(
      elapsed,
      factory.inflationPaidOut,
    );
    const ticketCost = calculateTicketCost(effectiveBurn);
    const challengeAllowed = canChallenge(availableInflation, ticketCost);
    const potentialWinReward = calculateWinReward(ticketCost);
    const predictedNetResult = calculatePredictedNetResult(
      factory.stakedGard,
      factory.burnReductions,
      factory.inflationPaidOut,
    );

    // Challenge value totals
    const totalWinsValue = factory.inflationPaidOut;
    const totalLossesValue = factory.challengeLossValue;
    const netChallengeValue = totalWinsValue - totalLossesValue;

    return {
      elapsed,
      burn,
      inflation,
      effectiveBurn,
      availableInflation,
      ticketCost,
      challengeAllowed,
      potentialWinReward,
      predictedNetResult,
      score: factory.score,
      stakedGard: factory.stakedGard,
      totalWinsValue,
      totalLossesValue,
      netChallengeValue,
    };
  }

  // Time control methods
  public togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.lastRealTime = performance.now();
      this.startTick();
    } else {
      this.stopTick();
    }
  }

  public setTimeSpeed(value: number) {
    this.timeSpeed = Math.max(1, Math.min(10, value));
  }

  // Land selection
  public selectLand(id: number | null) {
    // Clear chart history when changing selection
    if (id !== this.selectedLandId) {
      this.chartHistory = [];
    }
    this.selectedLandId = id;
    // Reset results when changing selection
    this.lastFactoryResult = null;
    this.lastChallengeResult = null;
  }

  // Factory creation - plays game and uses score immediately
  public createFactory(landId: number, lockAmount: number): boolean {
    if (lockAmount <= 0) return false;
    if (this.tycoonBalance < lockAmount) return false;

    const landIndex = this.lands.findIndex((l) => l.id === landId);
    if (landIndex === -1) return false;

    const land = this.lands[landIndex];
    if (hasFactory(land)) return false; // Already has factory

    // Play game to determine score - one chance!
    const score = playGame();

    // Tokenomics: Lock tokens from tycoon to vault
    this.tycoonBalance -= lockAmount;
    this.vaultBalance += lockAmount;

    // Record LOCK event
    this.tokenEvents = [
      ...this.tokenEvents,
      {
        time: this.simulationTime,
        type: 'LOCK',
        amount: lockAmount,
        source: 'factory_create',
        description: `Factory created on Land #${landId}, ${lockAmount.toFixed(2)} GARD locked`,
      },
    ];

    // Create factory on land with yellow paper structure
    const factory: Factory = {
      createdAt: this.simulationTime,
      stakedGard: lockAmount,
      score,
      burnReductions: 0,
      inflationPaidOut: 0,
      challengeWins: 0,
      challengeLosses: 0,
      challengeLossValue: 0,
    };

    const landWithFactory: LandWithFactory = {
      ...land,
      factory,
    };

    this.lands[landIndex] = landWithFactory;

    // Store result for UI display
    this.lastFactoryResult = { score };

    return true;
  }

  // Challenge system (yellow paper implementation) - plays game on challenge
  // Optional forceOutcome parameter for testing: 'win' or 'loss'
  public challenge(
    factoryLandId: number,
    forceOutcome?: 'win' | 'loss',
  ): ChallengeResult | null {
    const landIndex = this.lands.findIndex((l) => l.id === factoryLandId);
    if (landIndex === -1) return null;

    const land = this.lands[landIndex];
    if (!hasFactory(land)) return null;

    const stats = this.getFactoryStats(land);
    if (!stats) return null;

    const ticketCost = stats.ticketCost;

    // Check challenger can afford
    if (this.challengerBalance < ticketCost) return null;

    // Check liquidity constraint
    if (!stats.challengeAllowed) return null;

    // Determine outcome - either forced or by playing the game
    const factoryScore = land.factory.score;
    let playerScore: number;
    let won: boolean;

    if (forceOutcome === 'win') {
      playerScore = factoryScore + 1; // Ensure win
      won = true;
    } else if (forceOutcome === 'loss') {
      playerScore = Math.max(0, factoryScore - 1); // Ensure loss
      won = false;
    } else {
      // Play game to determine score - one chance!
      playerScore = playGame();
      won = playerScore > factoryScore;
    }

    let gardChange: number;

    // Deduct ticket cost from challenger
    this.challengerBalance -= ticketCost;

    if (won) {
      // Win: challenger earns gamma * Ticket from factory's inflation (MINTED)
      const winReward = calculateWinReward(ticketCost);
      gardChange = winReward;

      // Update factory - add to inflation paid out and increment win counter
      this.lands[landIndex] = {
        ...land,
        factory: {
          ...land.factory,
          inflationPaidOut: land.factory.inflationPaidOut + winReward,
          challengeWins: land.factory.challengeWins + 1,
        },
      };

      // Tokenomics: Burn the ticket cost
      this.burnBalance += ticketCost;
      this.totalBurned += ticketCost;

      // Tokenomics: Mint inflation to challenger
      this.challengerBalance += winReward;
      this.totalMinted += winReward;

      // Record BURN event for ticket
      this.tokenEvents = [
        ...this.tokenEvents,
        {
          time: this.simulationTime,
          type: 'BURN',
          amount: ticketCost,
          source: 'challenge_win_ticket',
          description: `Challenge ticket burned on Land #${factoryLandId}`,
        },
      ];

      // Record MINT event for reward
      this.tokenEvents = [
        ...this.tokenEvents,
        {
          time: this.simulationTime,
          type: 'MINT',
          amount: winReward,
          source: 'challenge_win',
          description: `Challenge won on Land #${factoryLandId}, ${winReward.toFixed(2)} GARD minted`,
        },
      ];
    } else {
      // Lose: ticket is burned, beta fraction reduces factory's burn obligation
      gardChange = -ticketCost;
      const burnReduction = LOSS_BURN_REDUCTION * ticketCost;

      // Update factory - add to burn reductions, increment loss counter, and track loss value
      this.lands[landIndex] = {
        ...land,
        factory: {
          ...land.factory,
          burnReductions: land.factory.burnReductions + burnReduction,
          challengeLosses: land.factory.challengeLosses + 1,
          challengeLossValue: land.factory.challengeLossValue + ticketCost,
        },
      };

      // Tokenomics: Burn the ticket
      this.burnBalance += ticketCost;
      this.totalBurned += ticketCost;

      // Record BURN event
      this.tokenEvents = [
        ...this.tokenEvents,
        {
          time: this.simulationTime,
          type: 'BURN',
          amount: ticketCost,
          source: 'challenge_loss',
          description: `Challenge lost on Land #${factoryLandId}, ${ticketCost.toFixed(2)} GARD burned`,
        },
      ];
    }

    const result: ChallengeResult = {
      playerScore,
      factoryScore,
      won,
      ticketCost,
      gardChange,
    };

    // Record challenge in history
    this.challengeHistory = [
      ...this.challengeHistory,
      {
        time: this.simulationTime,
        ticketCost,
        potentialReward: stats.potentialWinReward,
        playerScore,
        factoryScore,
        won,
        netResult: gardChange,
      },
    ];

    this.lastChallengeResult = result;

    return result;
  }

  // Collect chart data point for visualization
  private collectChartData() {
    if (this.selectedLandId === null) return;
    const land = this.lands.find((l) => l.id === this.selectedLandId);
    if (!land || !hasFactory(land)) return;

    const stats = this.getFactoryStats(land);
    if (!stats) return;

    // Sample every ~1 game hour (limit to 100 points max)
    const sampleInterval = 3600; // 1 hour in game seconds
    const lastPoint = this.chartHistory[this.chartHistory.length - 1];

    if (!lastPoint || this.simulationTime - lastPoint.time >= sampleInterval) {
      this.chartHistory = [
        ...this.chartHistory.slice(-99),
        {
          time: this.simulationTime,
          burn: stats.burn,
          inflation: stats.inflation,
          netSupply: stats.inflation - stats.burn,
          effectiveBurn: stats.effectiveBurn,
          availableInflation: stats.availableInflation,
          effectiveNet: stats.availableInflation - stats.effectiveBurn,
        },
      ];
    }
  }

  // Game tick (called each interval)
  private tick() {
    const now = performance.now();
    const realDeltaMs = now - this.lastRealTime;
    this.lastRealTime = now;

    // Convert real time to game time
    // realDeltaMs / 1000 = real seconds
    // * BASE_TIME_PER_REAL_SECOND = game seconds per real second
    // * timeSpeed = speed multiplier
    const gameDeltaSeconds =
      (realDeltaMs / 1000) * BASE_TIME_PER_REAL_SECOND * this.timeSpeed;

    // Advance simulation time
    this.simulationTime += gameDeltaSeconds;

    // Update land stakes using PonziLand tax formula
    this.lands = this.lands.map((land) => {
      const neighborCount = getNeighborCount(land.position, GRID_SIZE);
      const burnRate = calculateStakeBurnRate(land.sellPrice, neighborCount);
      // stake decreases linearly: delta = burnRate * time / baseTime
      const stakeDelta = (burnRate * gameDeltaSeconds) / BASE_TIME;
      const newStake = Math.max(0, land.stakeAmount - stakeDelta);

      return { ...land, stakeAmount: newStake };
    });

    // Check for factories that need to close (burn >= stake)
    this.checkFactoryClosure();

    // Collect chart data for visualization
    this.collectChartData();

    // Collect supply history for tokenomics charts
    this.collectSupplySnapshot();
  }

  // Collect supply snapshot for tokenomics visualization
  private collectSupplySnapshot() {
    // Sample every ~1 game hour (limit to 100 points max)
    const sampleInterval = 3600; // 1 hour in game seconds
    const lastPoint = this.supplyHistory[this.supplyHistory.length - 1];

    if (!lastPoint || this.simulationTime - lastPoint.time >= sampleInterval) {
      this.supplyHistory = [
        ...this.supplyHistory.slice(-99),
        {
          time: this.simulationTime,
          totalSupply: this.totalSupply,
          circulatingSupply: this.circulatingSupply,
          lockedSupply: this.vaultBalance,
          burnedSupply: this.burnBalance,
        },
      ];
    }
  }

  // Check if any factories should close (burn >= stake)
  private checkFactoryClosure() {
    const closedLandIds: number[] = [];

    this.lands = this.lands.map((land) => {
      if (!hasFactory(land)) return land;

      const stats = this.getFactoryStats(land);
      if (!stats) return land;

      // Close factory if effective burn >= staked amount OR land stake is depleted
      if (stats.effectiveBurn >= stats.stakedGard || land.stakeAmount <= 0) {
        const stakedAmount = stats.stakedGard;
        const burnObligation = Math.min(stats.effectiveBurn, stakedAmount);
        const refundAmount = stakedAmount - burnObligation;
        const inflationPayout = stats.availableInflation;

        // Release lock from vault
        this.vaultBalance -= stakedAmount;

        // 1. Burn only the burn obligation
        this.burnBalance += burnObligation;
        this.totalBurned += burnObligation;

        // Record BURN event for factory closure
        this.tokenEvents = [
          ...this.tokenEvents,
          {
            time: this.simulationTime,
            type: 'BURN',
            amount: burnObligation,
            source: 'factory_close',
            description: `Factory closed on Land #${land.id}, ${burnObligation.toFixed(2)} GARD burned`,
          },
        ];

        // 2. Refund unburned stake to tycoon
        if (refundAmount > 0) {
          this.tycoonBalance += refundAmount;
        }

        // 3. Mint remaining inflation to tycoon as profit
        if (inflationPayout > 0) {
          this.tycoonBalance += inflationPayout;
          this.totalMinted += inflationPayout;

          // Record MINT event for inflation payout
          this.tokenEvents = [
            ...this.tokenEvents,
            {
              time: this.simulationTime,
              type: 'MINT',
              amount: inflationPayout,
              source: 'factory_close',
              description: `Factory closed on Land #${land.id}, ${inflationPayout.toFixed(2)} GARD profit to Tycoon`,
            },
          ];
        }

        // Record the closure
        this.closedFactoryHistory = [
          ...this.closedFactoryHistory,
          {
            landId: land.id,
            closedAt: this.simulationTime,
            duration: stats.elapsed,
            stakedGard: stats.stakedGard,
            finalBurn: stats.effectiveBurn,
            finalInflation: stats.availableInflation,
            score: stats.score,
            totalChallenges:
              land.factory.challengeWins + land.factory.challengeLosses,
            wins: land.factory.challengeWins,
            losses: land.factory.challengeLosses,
          },
        ];

        closedLandIds.push(land.id);

        // Remove factory from land (convert back to BaseLand)
        const { factory, ...baseLand } = land;
        return baseLand as Land;
      }

      return land;
    });

    // Clear chart history if selected land's factory was closed
    if (
      this.selectedLandId !== null &&
      closedLandIds.includes(this.selectedLandId)
    ) {
      this.chartHistory = [];
    }
  }

  private startTick() {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  private stopTick() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  // Reset game to initial state
  public reset() {
    this.stopTick();
    this.lands = structuredClone(INITIAL_LANDS);
    this.isPlaying = false;
    this.timeSpeed = 1;
    this.selectedLandId = null;
    this.simulationTime = 0;

    // Reset tokenomics
    this.tycoonBalance = INITIAL_TYCOON_BALANCE;
    this.challengerBalance = INITIAL_CHALLENGER_BALANCE;
    this.vaultBalance = 0;
    this.burnBalance = 0;
    this.totalMinted = 0;
    this.totalBurned = 0;
    this.tokenEvents = [];
    this.supplyHistory = [];

    // Reset other state
    this.lastFactoryResult = null;
    this.lastChallengeResult = null;
    this.chartHistory = [];
    this.challengeHistory = [];
    this.closedFactoryHistory = [];
  }

  // Cleanup
  public destroy() {
    this.stopTick();
  }
}

// Singleton export
export const midgardGame = new MidgardGameStore();
