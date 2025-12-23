/**
 * Midgard API Store
 * Svelte 5 reactive store backed by the database API
 * Single wallet can act as both Tycoon (factory owner) and Challenger
 */

import * as api from './api-client';
import type {
  Wallet,
  Factory,
  FactoryStats,
  Challenge,
  SupplyStats,
} from './api-client';

class MidgardAPIStore {
  // Connection state
  public isConnected = $state(false);
  public isLoading = $state(false);
  public error = $state<string | null>(null);

  // Single wallet
  public walletAddress = $state('');
  public wallet = $state<Wallet | null>(null);

  // Current factory (for selected land)
  public currentFactory = $state<Factory | null>(null);
  public factoryStats = $state<FactoryStats | null>(null);

  // All factories (for factories list page)
  public factories = $state<Factory[]>([]);

  // Current challenge (pending)
  public pendingChallenge = $state<Challenge | null>(null);
  public lastChallengeResult = $state<Challenge | null>(null);

  // Factory challenges history
  public factoryChallenges = $state<Challenge[]>([]);

  // Supply stats
  public supplyStats = $state<SupplyStats | null>(null);

  // Selected land ID (for My Lands page)
  public selectedLandId = $state<string | null>(null);

  // Selected factory ID (for Factories page)
  public selectedFactoryId = $state<string | null>(null);

  // Derived balance
  public get walletBalance(): number {
    return this.wallet?.gardBalance ?? 0;
  }

  public get lockedBalance(): number {
    return this.wallet?.lockedBalance ?? 0;
  }

  public get totalSupply(): number {
    return this.supplyStats?.netSupply ?? 0;
  }

  public get totalLocked(): number {
    return this.supplyStats?.totalLocked ?? 0;
  }

  public get totalBurned(): number {
    return this.supplyStats?.totalBurned ?? 0;
  }

  // Factory status helpers
  public get factoryIsPending(): boolean {
    return this.currentFactory?.status === 'pending';
  }

  public get factoryIsActive(): boolean {
    return this.currentFactory?.status === 'active';
  }

  public get hasPendingChallenge(): boolean {
    return this.pendingChallenge !== null;
  }

  /**
   * Connect wallet (creates if it doesn't exist)
   */
  async connect(address: string): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const wallet = await api.createWallet(address);

      this.walletAddress = address;
      this.wallet = wallet;
      this.isConnected = true;

      // Load supply stats
      await this.refreshSupplyStats();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to connect';
      throw e;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Disconnect and reset state
   */
  disconnect(): void {
    this.isConnected = false;
    this.walletAddress = '';
    this.wallet = null;
    this.currentFactory = null;
    this.factoryStats = null;
    this.factories = [];
    this.pendingChallenge = null;
    this.lastChallengeResult = null;
    this.factoryChallenges = [];
    this.selectedLandId = null;
    this.selectedFactoryId = null;
  }

  /**
   * Refresh wallet balance
   */
  async refreshWallet(): Promise<void> {
    if (!this.isConnected) return;

    try {
      const wallet = await api.getWallet(this.walletAddress);
      if (wallet) this.wallet = wallet;
    } catch (e) {
      console.error('Failed to refresh wallet:', e);
    }
  }

  /**
   * Refresh supply stats
   */
  async refreshSupplyStats(): Promise<void> {
    try {
      this.supplyStats = await api.getSupplyStats();
    } catch (e) {
      console.error('Failed to refresh supply stats:', e);
    }
  }

  /**
   * Load all active factories
   */
  async loadFactories(): Promise<void> {
    try {
      this.factories = await api.getFactories({ status: 'active' });
    } catch (e) {
      console.error('Failed to load factories:', e);
    }
  }

  /**
   * Select a factory (for Factories page)
   */
  async selectFactory(factoryId: string): Promise<void> {
    this.selectedFactoryId = factoryId;

    try {
      const data = await api.getFactoryWithStats(factoryId);
      if (data) {
        this.currentFactory = data.factory;
        this.factoryStats = data.stats;
        // Load challenges for this factory
        this.factoryChallenges = await api.getFactoryChallenges(factoryId);
      }
    } catch (e) {
      console.error('Failed to select factory:', e);
    }
  }

  /**
   * Create a new factory (in pending status)
   */
  async createFactory(landId: string, stakedGard: number): Promise<Factory> {
    this.isLoading = true;
    this.error = null;

    try {
      const factory = await api.createFactory(
        landId,
        this.walletAddress,
        stakedGard,
      );

      this.currentFactory = factory;
      this.selectedLandId = landId;

      // Refresh wallet balance
      await this.refreshWallet();

      return factory;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to create factory';
      throw e;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Activate a pending factory with a score
   */
  async activateFactory(score: number): Promise<Factory> {
    if (!this.currentFactory || this.currentFactory.status !== 'pending') {
      throw new Error('No pending factory to activate');
    }

    this.isLoading = true;
    this.error = null;

    try {
      const factory = await api.activateFactory(this.currentFactory.id, score);
      this.currentFactory = factory;

      // Load stats now that factory is active
      await this.refreshFactoryStats();

      return factory;
    } catch (e) {
      this.error =
        e instanceof Error ? e.message : 'Failed to activate factory';
      throw e;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Refresh factory stats
   */
  async refreshFactoryStats(): Promise<void> {
    if (!this.currentFactory || this.currentFactory.status !== 'active') {
      this.factoryStats = null;
      return;
    }

    try {
      this.factoryStats = await api.getFactoryStats(this.currentFactory.id);
    } catch (e) {
      console.error('Failed to refresh factory stats:', e);
    }
  }

  /**
   * Load factory for a specific land
   */
  async loadFactoryByLand(landId: string): Promise<void> {
    this.selectedLandId = landId;

    try {
      const factory = await api.getFactoryByLand(landId);
      this.currentFactory = factory;

      if (factory && factory.status === 'active') {
        await this.refreshFactoryStats();
        // Load challenges for this factory
        this.factoryChallenges = await api.getFactoryChallenges(factory.id);
      } else {
        this.factoryStats = null;
        this.factoryChallenges = [];
      }
    } catch (e) {
      console.error('Failed to load factory:', e);
      this.currentFactory = null;
      this.factoryStats = null;
      this.factoryChallenges = [];
    }
  }

  /**
   * Start a challenge (burns ticket, creates pending challenge)
   */
  async createChallenge(factoryId?: string): Promise<Challenge> {
    const targetFactoryId = factoryId || this.currentFactory?.id;
    if (!targetFactoryId) {
      throw new Error('No factory to challenge');
    }

    this.isLoading = true;
    this.error = null;

    try {
      const challenge = await api.createChallenge(
        targetFactoryId,
        this.walletAddress,
      );

      this.pendingChallenge = challenge;

      // Refresh wallet balance (ticket burned)
      await this.refreshWallet();

      return challenge;
    } catch (e) {
      this.error =
        e instanceof Error ? e.message : 'Failed to create challenge';
      throw e;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Complete a pending challenge with player's score
   */
  async completeChallenge(playerScore: number): Promise<Challenge> {
    if (!this.pendingChallenge) {
      throw new Error('No pending challenge to complete');
    }

    this.isLoading = true;
    this.error = null;

    try {
      const result = await api.completeChallenge(
        this.pendingChallenge.id,
        playerScore,
      );

      this.lastChallengeResult = result;
      this.pendingChallenge = null;

      // Refresh everything
      await Promise.all([
        this.refreshWallet(),
        this.refreshFactoryStats(),
        this.refreshSupplyStats(),
      ]);

      // Reload factory to get updated stats
      if (this.currentFactory) {
        const updatedFactory = await api.getFactory(this.currentFactory.id);
        if (updatedFactory) {
          this.currentFactory = updatedFactory;
        }
        // Refresh challenges list
        this.factoryChallenges = await api.getFactoryChallenges(
          this.currentFactory.id,
        );
      }

      return result;
    } catch (e) {
      this.error =
        e instanceof Error ? e.message : 'Failed to complete challenge';
      throw e;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Close the current factory
   */
  async closeFactory(): Promise<void> {
    if (!this.currentFactory) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      await api.closeFactory(this.currentFactory.id, 'manual');

      // Reload factory (now closed)
      const factory = await api.getFactory(this.currentFactory.id);
      this.currentFactory = factory;
      this.factoryStats = null;

      // Refresh balances
      await Promise.all([this.refreshWallet(), this.refreshSupplyStats()]);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to close factory';
      throw e;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Reset for a new game on the same land
   */
  clearFactory(): void {
    this.currentFactory = null;
    this.factoryStats = null;
    this.pendingChallenge = null;
    this.lastChallengeResult = null;
    this.factoryChallenges = [];
  }

  /**
   * Clear last challenge result
   */
  clearLastResult(): void {
    this.lastChallengeResult = null;
  }
}

// Singleton instance
export const midgardAPI = new MidgardAPIStore();

// Export for context usage if needed
export function getMidgardAPI(): MidgardAPIStore {
  return midgardAPI;
}
