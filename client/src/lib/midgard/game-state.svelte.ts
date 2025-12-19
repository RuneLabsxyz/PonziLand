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
} from './types';
import { hasFactory } from './types';
import {
  INITIAL_GARD_BALANCE,
  INITIAL_LANDS,
  TICK_INTERVAL_MS,
  BASE_TIME_PER_REAL_SECOND,
  LOSS_BURN_REDUCTION,
  WIN_PAYOUT_MULTIPLIER,
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
  public playerGardBalance = $state<number>(INITIAL_GARD_BALANCE);
  public isPlaying = $state<boolean>(false);
  public timeSpeed = $state<number>(1);
  public selectedLandId = $state<number | null>(null);

  // Simulation time in game seconds
  public simulationTime = $state<number>(0);

  // For factory creation flow
  public pendingFactoryScore = $state<number | null>(null);

  // For challenge flow
  public challengeScore = $state<number | null>(null);
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
    // Reset pending states when changing selection
    this.pendingFactoryScore = null;
    this.challengeScore = null;
    this.lastChallengeResult = null;
  }

  // Roll a random score for factory creation (mini-game)
  public rollFactoryScore(): number {
    const score = playGame();
    this.pendingFactoryScore = score;
    return score;
  }

  // Roll a random score for challenge (mini-game)
  public rollChallengeScore(): number {
    const score = playGame();
    this.challengeScore = score;
    return score;
  }

  // Factory creation
  public createFactory(landId: number, lockAmount: number): boolean {
    if (this.pendingFactoryScore === null) return false;
    if (lockAmount <= 0) return false;
    if (this.playerGardBalance < lockAmount) return false;

    const landIndex = this.lands.findIndex((l) => l.id === landId);
    if (landIndex === -1) return false;

    const land = this.lands[landIndex];
    if (hasFactory(land)) return false; // Already has factory

    // Deduct from player balance
    this.playerGardBalance -= lockAmount;

    // Create factory on land with yellow paper structure
    const factory: Factory = {
      createdAt: this.simulationTime,
      stakedGard: lockAmount,
      score: this.pendingFactoryScore,
      burnReductions: 0,
      inflationPaidOut: 0,
    };

    const landWithFactory: LandWithFactory = {
      ...land,
      factory,
    };

    this.lands[landIndex] = landWithFactory;

    // Reset pending score
    this.pendingFactoryScore = null;

    return true;
  }

  // Challenge system (yellow paper implementation)
  public challenge(factoryLandId: number): ChallengeResult | null {
    if (this.challengeScore === null) return null;

    const landIndex = this.lands.findIndex((l) => l.id === factoryLandId);
    if (landIndex === -1) return null;

    const land = this.lands[landIndex];
    if (!hasFactory(land)) return null;

    const stats = this.getFactoryStats(land);
    if (!stats) return null;

    const ticketCost = stats.ticketCost;

    // Check player can afford
    if (this.playerGardBalance < ticketCost) return null;

    // Check liquidity constraint
    if (!stats.challengeAllowed) return null;

    const playerScore = this.challengeScore;
    const factoryScore = land.factory.score;
    const won = playerScore > factoryScore;

    let gardChange: number;

    // Deduct ticket cost (burned in both cases initially)
    this.playerGardBalance -= ticketCost;

    if (won) {
      // Win: challenger earns gamma * Ticket from factory's inflation
      const winReward = calculateWinReward(ticketCost);
      gardChange = winReward;

      // Update factory - add to inflation paid out
      this.lands[landIndex] = {
        ...land,
        factory: {
          ...land.factory,
          inflationPaidOut: land.factory.inflationPaidOut + winReward,
        },
      };

      this.playerGardBalance += winReward;
    } else {
      // Lose: ticket is burned, beta fraction reduces factory's burn obligation
      gardChange = -ticketCost;
      const burnReduction = LOSS_BURN_REDUCTION * ticketCost;

      // Update factory - add to burn reductions
      this.lands[landIndex] = {
        ...land,
        factory: {
          ...land.factory,
          burnReductions: land.factory.burnReductions + burnReduction,
        },
      };
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
    this.challengeScore = null;

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
  }

  // Check if any factories should close (burn >= stake)
  private checkFactoryClosure() {
    const closedLandIds: number[] = [];

    this.lands = this.lands.map((land) => {
      if (!hasFactory(land)) return land;

      const stats = this.getFactoryStats(land);
      if (!stats) return land;

      // Close factory if effective burn >= staked amount
      if (stats.effectiveBurn >= stats.stakedGard) {
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
    this.playerGardBalance = INITIAL_GARD_BALANCE;
    this.isPlaying = false;
    this.timeSpeed = 1;
    this.selectedLandId = null;
    this.simulationTime = 0;
    this.pendingFactoryScore = null;
    this.challengeScore = null;
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
