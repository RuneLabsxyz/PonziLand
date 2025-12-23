import { eq, sql } from 'drizzle-orm';
import { getDb, factories, factoryClosures, challenges, wallets } from '../db';
import type {
  Factory,
  FactoryClosure,
  NewFactoryClosure,
  Challenge,
} from '../db';
import * as walletService from './wallet.service';
import * as factoryService from './factory.service';

export type CloseReason = 'burn_exceeded' | 'stake_depleted' | 'manual';

export interface CloseResult {
  status: 'closed' | 'already_closed' | 'not_ready' | 'already_processing';
  closeReason?: CloseReason;
  settlement?: {
    burnAmount: number;
    refundAmount: number;
    profitAmount: number;
  };
  closure?: FactoryClosure;
}

// Simple in-memory lock for idempotency
const processingLocks = new Set<string>();

/**
 * Acquire a lock for factory processing
 */
function acquireLock(factoryId: string): boolean {
  if (processingLocks.has(factoryId)) {
    return false;
  }
  processingLocks.add(factoryId);
  return true;
}

/**
 * Release a lock for factory processing
 */
function releaseLock(factoryId: string): void {
  processingLocks.delete(factoryId);
}

/**
 * Close a factory (idempotent operation)
 * Handles settlement: refund remaining stake, burn obligation, pay out profits
 */
export async function closeFactory(
  factoryId: string,
  reason: CloseReason = 'burn_exceeded',
): Promise<CloseResult> {
  const db = getDb();

  // Acquire lock to prevent race conditions
  if (!acquireLock(factoryId)) {
    return { status: 'already_processing' };
  }

  try {
    // Get factory
    const factory = await factoryService.getFactory(factoryId);
    if (!factory) {
      return { status: 'not_ready' };
    }

    // Check if already closed
    if (factory.status !== 'active') {
      return { status: 'already_closed' };
    }

    // Compute final stats
    const stats = factoryService.computeFactoryStats(factory);

    // Only auto-close if burn >= stake (unless manual)
    if (reason !== 'manual' && stats.effectiveBurn < factory.stakedGard) {
      return { status: 'not_ready' };
    }

    // Calculate settlement
    const burnObligation = Math.min(stats.effectiveBurn, factory.stakedGard);
    const refundAmount = Math.max(0, factory.stakedGard - burnObligation);
    const profitAmount = stats.availableInflation;

    // Get duration
    const createdAt =
      factory.createdAtTime instanceof Date
        ? factory.createdAtTime
        : new Date(factory.createdAtTime);
    const durationSeconds = Math.floor(
      (Date.now() - createdAt.getTime()) / 1000,
    );

    // Handle pending challenges - expire and refund them
    await expirePendingChallenges(factoryId);

    // Update factory status
    await db
      .update(factories)
      .set({
        status: 'closed',
        closedAtTime: new Date(),
        closeReason: reason,
        finalBurn: stats.effectiveBurn,
        finalInflation: stats.availableInflation,
        refundAmount,
      })
      .where(eq(factories.id, factoryId));

    // Update owner wallet:
    // - Unlock the staked amount
    // - Add refund to balance
    // - Add profit (available inflation) to balance
    // - Record burn
    await db
      .update(wallets)
      .set({
        lockedBalance: sql`${wallets.lockedBalance} - ${factory.stakedGard}`,
        gardBalance: sql`${wallets.gardBalance} + ${refundAmount} + ${profitAmount}`,
        totalBurned: sql`${wallets.totalBurned} + ${burnObligation}`,
        totalMinted: sql`${wallets.totalMinted} + ${profitAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.address, factory.ownerAddress));

    // Create closure record
    const closureData: NewFactoryClosure = {
      factoryId,
      closedAtTime: new Date(),
      durationSeconds,
      stakedGard: factory.stakedGard,
      finalBurn: stats.effectiveBurn,
      finalInflation: stats.availableInflation,
      netResult: stats.availableInflation - stats.effectiveBurn,
      totalChallenges: factory.challengeWins + factory.challengeLosses,
      challengerWins: factory.challengeWins,
      challengerLosses: factory.challengeLosses,
      burnAmount: burnObligation,
      refundAmount,
      profitAmount,
      closeReason: reason,
    };

    const closureResult = await db
      .insert(factoryClosures)
      .values(closureData)
      .returning();
    const closure = closureResult[0];

    // Log token events
    if (burnObligation > 0) {
      await walletService.logTokenEvent(
        factory.ownerAddress,
        'BURN',
        burnObligation,
        'factory_close',
        factoryId,
        `Factory closed: ${burnObligation} GARD burned (obligation)`,
      );
    }

    if (refundAmount > 0) {
      await walletService.logTokenEvent(
        factory.ownerAddress,
        'UNLOCK',
        refundAmount,
        'factory_close',
        factoryId,
        `Factory closed: ${refundAmount} GARD refunded`,
      );
    }

    if (profitAmount > 0) {
      await walletService.logTokenEvent(
        factory.ownerAddress,
        'MINT',
        profitAmount,
        'factory_close',
        factoryId,
        `Factory closed: ${profitAmount} GARD profit (inflation)`,
      );
    }

    return {
      status: 'closed',
      closeReason: reason,
      settlement: {
        burnAmount: burnObligation,
        refundAmount,
        profitAmount,
      },
      closure,
    };
  } finally {
    releaseLock(factoryId);
  }
}

/**
 * Expire pending challenges for a factory (refund tickets)
 */
async function expirePendingChallenges(factoryId: string): Promise<void> {
  const db = getDb();

  // Get all pending challenges
  const pendingChallenges = await db
    .select()
    .from(challenges)
    .where(eq(challenges.factoryId, factoryId));

  const pending = pendingChallenges.filter((c) => c.status === 'pending');

  for (const challenge of pending) {
    // Refund ticket to challenger
    await walletService.updateGardBalance(
      challenge.challengerAddress,
      challenge.ticketCost,
    );

    // Log refund event
    await walletService.logTokenEvent(
      challenge.challengerAddress,
      'UNLOCK',
      challenge.ticketCost,
      'challenge_expired',
      challenge.id,
      `Challenge expired (factory closed): ${challenge.ticketCost} GARD refunded`,
    );

    // Update challenge status
    await db
      .update(challenges)
      .set({
        status: 'expired',
        completedAtTime: new Date(),
      })
      .where(eq(challenges.id, challenge.id));
  }
}

/**
 * Check all active factories for closure conditions
 * This can be called periodically as a cron job
 */
export async function checkFactoriesForClosure(): Promise<CloseResult[]> {
  const results: CloseResult[] = [];

  // Get all active factories
  const activeFactories = await factoryService.getActiveFactories();

  for (const factory of activeFactories) {
    if (factoryService.shouldCloseFactory(factory)) {
      const result = await closeFactory(factory.id, 'burn_exceeded');
      results.push(result);
    }
  }

  return results;
}

/**
 * Get factory closure record by factory ID
 */
export async function getFactoryClosure(
  factoryId: string,
): Promise<FactoryClosure | null> {
  const db = getDb();

  const result = await db
    .select()
    .from(factoryClosures)
    .where(eq(factoryClosures.factoryId, factoryId));

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all factory closures (optionally limited)
 */
export async function getFactoryClosures(
  limit = 100,
): Promise<FactoryClosure[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(factoryClosures)
    .orderBy(sql`${factoryClosures.closedAtTime} DESC`)
    .limit(limit);

  return result;
}
