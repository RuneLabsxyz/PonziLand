import { eq, and, sql } from 'drizzle-orm';
import { getDb, factories, challenges } from '../db';
import type { Factory, NewFactory, Challenge } from '../db';
import {
  calculateBurn,
  calculateInflation,
  calculateEffectiveBurn,
  calculateAvailableInflation,
  calculateTicketCost,
  calculateWinReward,
  canChallenge,
  calculatePredictedNetResult,
} from '../formulas';
import { BURN_RATE, LOSS_BURN_REDUCTION } from '../constants';
import * as walletService from './wallet.service';

export interface FactoryStats {
  factoryId: string;
  elapsedSeconds: number;
  burn: number;
  inflation: number;
  effectiveBurn: number;
  availableInflation: number;
  ticketCost: number;
  potentialReward: number;
  challengeAllowed: boolean;
  predictedNetResult: number;
  timeToClose: number;
}

export interface CreateFactoryParams {
  landId: string;
  ownerAddress: string;
  stakedGard: number;
  createdAtBlock?: number;
}

/**
 * Create a new factory on a land (status: pending, no score yet)
 * Factory must be activated with a score to become active
 */
export async function createFactory(
  params: CreateFactoryParams,
): Promise<Factory> {
  const db = getDb();
  const { landId, ownerAddress, stakedGard, createdAtBlock = 0 } = params;

  // Ensure wallet exists
  await walletService.getOrCreateWallet(ownerAddress);

  // Lock GARD from owner's wallet
  await walletService.lockGard(ownerAddress, stakedGard);

  // Create factory record (pending status, no score)
  const newFactory: NewFactory = {
    landId,
    ownerAddress,
    stakedGard,
    score: null, // Set on activation
    createdAtBlock,
    createdAtTime: new Date(),
    burnReductions: 0,
    inflationPaidOut: 0,
    challengeWins: 0,
    challengeLosses: 0,
    status: 'pending',
  };

  const result = await db.insert(factories).values(newFactory).returning();
  const factory = result[0];

  // Log token event for the lock
  await walletService.logTokenEvent(
    ownerAddress,
    'LOCK',
    stakedGard,
    'factory_create',
    factory.id,
    `Locked ${stakedGard} GARD for factory on land ${landId}`,
  );

  return factory;
}

/**
 * Activate a pending factory with a score
 */
export async function activateFactory(
  factoryId: string,
  score: number,
): Promise<Factory> {
  const db = getDb();

  const result = await db
    .update(factories)
    .set({
      score,
      status: 'active',
    })
    .where(and(eq(factories.id, factoryId), eq(factories.status, 'pending')))
    .returning();

  if (result.length === 0) {
    throw new Error('Factory not found or not in pending status');
  }

  return result[0];
}

/**
 * Get factory by ID
 */
export async function getFactory(id: string): Promise<Factory | null> {
  const db = getDb();

  const result = await db.select().from(factories).where(eq(factories.id, id));

  return result.length > 0 ? result[0] : null;
}

/**
 * Get active or pending factory on a specific land
 */
export async function getFactoryByLand(
  landId: string,
): Promise<Factory | null> {
  const db = getDb();

  // Find factory that is either pending or active (not closed)
  const result = await db
    .select()
    .from(factories)
    .where(
      and(
        eq(factories.landId, landId),
        sql`${factories.status} IN ('pending', 'active')`,
      ),
    );

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all factories (optionally filtered by status or owner)
 */
export async function getFactories(options?: {
  status?: 'pending' | 'active' | 'closed';
  ownerAddress?: string;
}): Promise<Factory[]> {
  const db = getDb();

  const conditions = [];
  if (options?.status) {
    conditions.push(eq(factories.status, options.status));
  }
  if (options?.ownerAddress) {
    conditions.push(eq(factories.ownerAddress, options.ownerAddress));
  }

  let query = db.select().from(factories);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const result = await query.orderBy(sql`${factories.createdAtTime} DESC`);
  return result;
}

/**
 * Get all active factories
 */
export async function getActiveFactories(): Promise<Factory[]> {
  return getFactories({ status: 'active' });
}

/**
 * Compute real-time factory stats using Yellow Paper formulas
 */
export function computeFactoryStats(
  factory: Factory,
  currentTime: Date = new Date(),
): FactoryStats {
  const createdAt =
    factory.createdAtTime instanceof Date
      ? factory.createdAtTime
      : new Date(factory.createdAtTime);
  const elapsedSeconds = Math.floor(
    (currentTime.getTime() - createdAt.getTime()) / 1000,
  );

  const burn = calculateBurn(elapsedSeconds);
  const inflation = calculateInflation(elapsedSeconds);
  const effectiveBurn = calculateEffectiveBurn(
    elapsedSeconds,
    factory.burnReductions,
  );
  const availableInflation = calculateAvailableInflation(
    elapsedSeconds,
    factory.inflationPaidOut,
  );
  const ticketCost = calculateTicketCost(effectiveBurn);
  const potentialReward = calculateWinReward(ticketCost);
  const challengeAllowed = canChallenge(availableInflation, ticketCost);
  const predictedNetResult = calculatePredictedNetResult(
    factory.stakedGard,
    factory.burnReductions,
    factory.inflationPaidOut,
  );

  // Time until effective burn >= staked GARD
  const remainingBurn = factory.stakedGard - effectiveBurn;
  const timeToClose = remainingBurn > 0 ? remainingBurn / BURN_RATE : 0;

  return {
    factoryId: factory.id,
    elapsedSeconds,
    burn,
    inflation,
    effectiveBurn,
    availableInflation,
    ticketCost,
    potentialReward,
    challengeAllowed,
    predictedNetResult,
    timeToClose,
  };
}

/**
 * Update factory aggregate stats after a challenge
 */
export async function updateFactoryAfterChallenge(
  factoryId: string,
  challengerWon: boolean,
  ticketCost: number,
): Promise<Factory> {
  const db = getDb();

  if (challengerWon) {
    // Challenger won: increment wins, add to inflation paid out
    const reward = calculateWinReward(ticketCost);
    const result = await db
      .update(factories)
      .set({
        challengeWins: sql`${factories.challengeWins} + 1`,
        inflationPaidOut: sql`${factories.inflationPaidOut} + ${reward}`,
      })
      .where(eq(factories.id, factoryId))
      .returning();

    return result[0];
  } else {
    // Challenger lost: increment losses, add burn reduction
    const burnReduction = LOSS_BURN_REDUCTION * ticketCost;

    const result = await db
      .update(factories)
      .set({
        challengeLosses: sql`${factories.challengeLosses} + 1`,
        burnReductions: sql`${factories.burnReductions} + ${burnReduction}`,
      })
      .where(eq(factories.id, factoryId))
      .returning();

    return result[0];
  }
}

/**
 * Get challenges for a factory
 */
export async function getFactoryChallenges(
  factoryId: string,
): Promise<Challenge[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(challenges)
    .where(eq(challenges.factoryId, factoryId))
    .orderBy(sql`${challenges.createdAtTime} DESC`);

  return result;
}

/**
 * Check if a factory should be closed (burn >= stake)
 */
export function shouldCloseFactory(
  factory: Factory,
  currentTime: Date = new Date(),
): boolean {
  if (factory.status !== 'active') {
    return false;
  }

  const stats = computeFactoryStats(factory, currentTime);
  return stats.effectiveBurn >= factory.stakedGard;
}
