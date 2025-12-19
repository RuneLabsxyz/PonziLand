/**
 * Midgard API Store
 * Svelte 5 reactive store backed by the database API
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

  // Wallet addresses
  public tycoonAddress = $state('');
  public challengerAddress = $state('');

  // Wallet data
  public tycoonWallet = $state<Wallet | null>(null);
  public challengerWallet = $state<Wallet | null>(null);

  // Current factory (pending or active)
  public currentFactory = $state<Factory | null>(null);
  public factoryStats = $state<FactoryStats | null>(null);

  // Current challenge (pending)
  public pendingChallenge = $state<Challenge | null>(null);
  public lastChallengeResult = $state<Challenge | null>(null);

  // Supply stats
  public supplyStats = $state<SupplyStats | null>(null);

  // Selected land ID (for UI)
  public selectedLandId = $state<string | null>(null);

  // Derived balances
  public get tycoonBalance(): number {
    return this.tycoonWallet?.gardBalance ?? 0;
  }

  public get challengerBalance(): number {
    return this.challengerWallet?.gardBalance ?? 0;
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
   * Connect wallets (creates if they don't exist)
   */
  async connect(tycoonAddr: string, challengerAddr: string): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // Create/get both wallets
      const [tycoon, challenger] = await Promise.all([
        api.createWallet(tycoonAddr),
        api.createWallet(challengerAddr),
      ]);

      this.tycoonAddress = tycoonAddr;
      this.challengerAddress = challengerAddr;
      this.tycoonWallet = tycoon;
      this.challengerWallet = challenger;
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
    this.tycoonAddress = '';
    this.challengerAddress = '';
    this.tycoonWallet = null;
    this.challengerWallet = null;
    this.currentFactory = null;
    this.factoryStats = null;
    this.pendingChallenge = null;
    this.lastChallengeResult = null;
    this.selectedLandId = null;
  }

  /**
   * Refresh wallet balances
   */
  async refreshWallets(): Promise<void> {
    if (!this.isConnected) return;

    try {
      const [tycoon, challenger] = await Promise.all([
        api.getWallet(this.tycoonAddress),
        api.getWallet(this.challengerAddress),
      ]);

      if (tycoon) this.tycoonWallet = tycoon;
      if (challenger) this.challengerWallet = challenger;
    } catch (e) {
      console.error('Failed to refresh wallets:', e);
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
   * Create a new factory (in pending status)
   */
  async createFactory(landId: string, stakedGard: number): Promise<Factory> {
    this.isLoading = true;
    this.error = null;

    try {
      const factory = await api.createFactory(
        landId,
        this.tycoonAddress,
        stakedGard,
      );

      this.currentFactory = factory;
      this.selectedLandId = landId;

      // Refresh wallet balance
      await this.refreshWallets();

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
      } else {
        this.factoryStats = null;
      }
    } catch (e) {
      console.error('Failed to load factory:', e);
      this.currentFactory = null;
      this.factoryStats = null;
    }
  }

  /**
   * Start a challenge (deducts ticket, creates pending challenge)
   */
  async createChallenge(): Promise<Challenge> {
    if (!this.currentFactory || this.currentFactory.status !== 'active') {
      throw new Error('No active factory to challenge');
    }

    this.isLoading = true;
    this.error = null;

    try {
      const challenge = await api.createChallenge(
        this.currentFactory.id,
        this.challengerAddress,
      );

      this.pendingChallenge = challenge;

      // Refresh wallet balance (ticket deducted)
      await this.refreshWallets();

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
        this.refreshWallets(),
        this.refreshFactoryStats(),
        this.refreshSupplyStats(),
      ]);

      // Reload factory to get updated stats
      if (this.currentFactory) {
        const updatedFactory = await api.getFactory(this.currentFactory.id);
        if (updatedFactory) {
          this.currentFactory = updatedFactory;
        }
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
   * Cancel a pending challenge (refund ticket)
   */
  async cancelChallenge(): Promise<void> {
    if (!this.pendingChallenge) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      await api.cancelChallenge(this.pendingChallenge.id);
      this.pendingChallenge = null;

      // Refresh wallet balance (ticket refunded)
      await this.refreshWallets();
    } catch (e) {
      this.error =
        e instanceof Error ? e.message : 'Failed to cancel challenge';
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
      await Promise.all([this.refreshWallets(), this.refreshSupplyStats()]);
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
  }
}

// Singleton instance
export const midgardAPI = new MidgardAPIStore();

// Export for context usage if needed
export function getMidgardAPI(): MidgardAPIStore {
  return midgardAPI;
}
