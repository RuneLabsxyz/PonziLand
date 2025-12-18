import type { Land, LandWithFactory, Factory, ChallengeResult } from './types';
import { hasFactory } from './types';
import {
  INITIAL_GARD_BALANCE,
  INITIAL_LANDS,
  TICK_INTERVAL_MS,
  STAKE_DECREASE_RATE,
  FACTORY_MINT_RATE,
  FACTORY_BURN_RATE,
  CHALLENGE_WIN_MULTIPLIER,
  CHALLENGE_SUPPLY_SHARE,
} from './constants';

export class MidgardGameStore {
  // Reactive state using Svelte 5 runes
  public lands = $state<Land[]>(structuredClone(INITIAL_LANDS));
  public playerGardBalance = $state<number>(INITIAL_GARD_BALANCE);
  public isPlaying = $state<boolean>(false);
  public timeMultiplier = $state<number>(1);
  public selectedLandId = $state<number | null>(null);

  // For factory creation flow
  public pendingFactoryScore = $state<number | null>(null);

  // For challenge flow
  public challengeScore = $state<number | null>(null);
  public lastChallengeResult = $state<ChallengeResult | null>(null);

  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {}

  // Get selected land (derived-like getter)
  public get selectedLand(): Land | null {
    if (this.selectedLandId === null) return null;
    return this.lands.find((l) => l.id === this.selectedLandId) ?? null;
  }

  // Time control methods
  public togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.startTick();
    } else {
      this.stopTick();
    }
  }

  public setTimeMultiplier(value: number) {
    this.timeMultiplier = Math.max(0.5, Math.min(3, value));
  }

  // Land selection
  public selectLand(id: number | null) {
    this.selectedLandId = id;
    // Reset pending states when changing selection
    this.pendingFactoryScore = null;
    this.challengeScore = null;
    this.lastChallengeResult = null;
  }

  // Roll a random score for factory creation
  public rollFactoryScore(): number {
    const score = Math.floor(Math.random() * 101); // 0-100
    this.pendingFactoryScore = score;
    return score;
  }

  // Roll a random score for challenge
  public rollChallengeScore(): number {
    const score = Math.floor(Math.random() * 101); // 0-100
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

    // Create factory on land
    const factory: Factory = {
      lockedGard: lockAmount,
      initialLockedGard: lockAmount,
      mintedSupply: 0,
      burntAmount: 0,
      score: this.pendingFactoryScore,
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

  // Challenge system
  public challenge(
    factoryLandId: number,
    cost: number,
  ): ChallengeResult | null {
    if (this.challengeScore === null) return null;
    if (cost <= 0) return null;
    if (this.playerGardBalance < cost) return null;

    const landIndex = this.lands.findIndex((l) => l.id === factoryLandId);
    if (landIndex === -1) return null;

    const land = this.lands[landIndex];
    if (!hasFactory(land)) return null;

    const playerScore = this.challengeScore;
    const factoryScore = land.factory.score;
    const won = playerScore > factoryScore;

    let gardChange: number;

    if (won) {
      // Win: get back 2x cost + 50% of factory's minted supply
      const winnings = cost * CHALLENGE_WIN_MULTIPLIER;
      const supplyShare = land.factory.mintedSupply * CHALLENGE_SUPPLY_SHARE;
      gardChange = winnings + supplyShare;

      // Update factory - reduce minted supply
      this.lands[landIndex] = {
        ...land,
        factory: {
          ...land.factory,
          mintedSupply: land.factory.mintedSupply - supplyShare,
        },
      };

      this.playerGardBalance += gardChange;
    } else {
      // Lose: cost is burned, factory recovers burnt tokens
      gardChange = -cost;
      this.playerGardBalance -= cost;

      // Factory recovers burnt tokens
      this.lands[landIndex] = {
        ...land,
        factory: {
          ...land.factory,
          burntAmount: Math.max(0, land.factory.burntAmount - cost),
        },
      };
    }

    const result: ChallengeResult = {
      playerScore,
      factoryScore,
      won,
      gardChange,
    };

    this.lastChallengeResult = result;
    this.challengeScore = null;

    return result;
  }

  // Game tick (called each interval)
  private tick() {
    const multiplier = this.timeMultiplier;

    this.lands = this.lands.map((land) => {
      // Decrease stake on all lands
      const newStake = Math.max(
        0,
        land.stakeAmount * (1 - STAKE_DECREASE_RATE * multiplier),
      );

      if (hasFactory(land)) {
        // Update factory
        const mintAmount =
          land.factory.lockedGard * FACTORY_MINT_RATE * multiplier;
        const burnAmount =
          land.factory.lockedGard * FACTORY_BURN_RATE * multiplier;

        return {
          ...land,
          stakeAmount: newStake,
          factory: {
            ...land.factory,
            mintedSupply: land.factory.mintedSupply + mintAmount,
            lockedGard: Math.max(0, land.factory.lockedGard - burnAmount),
            burntAmount: land.factory.burntAmount + burnAmount,
          },
        };
      }

      return { ...land, stakeAmount: newStake };
    });
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
    this.timeMultiplier = 1;
    this.selectedLandId = null;
    this.pendingFactoryScore = null;
    this.challengeScore = null;
    this.lastChallengeResult = null;
  }

  // Cleanup
  public destroy() {
    this.stopTick();
  }
}

// Singleton export
export const midgardGame = new MidgardGameStore();
