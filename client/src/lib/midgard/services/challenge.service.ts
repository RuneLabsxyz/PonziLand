import { eq, and, sql } from 'drizzle-orm';
import { getDb, challenges, wallets } from '../db';
import type { Challenge, NewChallenge } from '../db';
import { calculateWinReward, playGame } from '../formulas';
import { LOSS_BURN_REDUCTION } from '../constants';
import * as walletService from './wallet.service';
import * as factoryService from './factory.service';

export interface CreateChallengeParams {
  factoryId: string;
  challengerAddress: string;
  createdAtBlock?: number;
}

export interface CompleteChallengeResult {
  challenge: Challenge;
  playerScore: number;
  factoryScore: number;
  won: boolean;
  gardChange: number;
  burnReduction: number;
}

/**
 * Create a new challenge (Phase 1: pending)
 * This deducts the ticket cost from the challenger's wallet
 */
export async function createChallenge(
  params: CreateChallengeParams,
): Promise<Challenge> {
  const db = getDb();
  const { factoryId, challengerAddress, createdAtBlock = 0 } = params;

  // Get factory and validate
  const factory = await factoryService.getFactory(factoryId);
  if (!factory) {
    throw new Error(`Factory ${factoryId} not found`);
  }

  if (factory.status !== 'active') {
    throw new Error(`Factory ${factoryId} is not active`);
  }

  // Compute factory stats
  const stats = factoryService.computeFactoryStats(factory);

  // Check if challenge is allowed (liquidity constraint)
  if (!stats.challengeAllowed) {
    throw new Error(
      `Challenge not allowed: insufficient inflation (need ${stats.potentialReward}, have ${stats.availableInflation})`,
    );
  }

  // Ensure challenger wallet exists
  await walletService.getOrCreateWallet(challengerAddress);

  // Get challenger's wallet to check balance
  const wallet = await walletService.getWallet(challengerAddress);
  if (!wallet || wallet.gardBalance < stats.ticketCost) {
    throw new Error(
      `Insufficient balance: need ${stats.ticketCost}, have ${wallet?.gardBalance ?? 0}`,
    );
  }

  // Deduct ticket cost from challenger (held in escrow until game result)
  await walletService.updateGardBalance(challengerAddress, -stats.ticketCost);

  // Create challenge record
  const newChallenge: NewChallenge = {
    factoryId,
    challengerAddress,
    status: 'pending',
    createdAtBlock,
    createdAtTime: new Date(),
    factoryAgeSeconds: stats.elapsedSeconds,
    ticketCost: stats.ticketCost,
    potentialReward: stats.potentialReward,
    effectiveBurn: stats.effectiveBurn,
    availableInflation: stats.availableInflation,
  };

  const result = await db.insert(challenges).values(newChallenge).returning();
  const challenge = result[0];

  // Log ticket payment event
  await walletService.logTokenEvent(
    challengerAddress,
    'LOCK',
    stats.ticketCost,
    'challenge_create',
    challenge.id,
    `Paid ${stats.ticketCost} GARD ticket for challenge on factory ${factoryId}`,
  );

  return challenge;
}

/**
 * Complete a challenge with a player score (Phase 2: settlement)
 */
export async function completeChallenge(
  challengeId: string,
  playerScore: number,
): Promise<CompleteChallengeResult> {
  const db = getDb();

  // Get challenge
  const challengeResult = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId));

  if (challengeResult.length === 0) {
    throw new Error(`Challenge ${challengeId} not found`);
  }

  const challenge = challengeResult[0];

  if (challenge.status !== 'pending') {
    throw new Error(
      `Challenge ${challengeId} is not pending (status: ${challenge.status})`,
    );
  }

  // Get factory for the score
  const factory = await factoryService.getFactory(challenge.factoryId);
  if (!factory) {
    throw new Error(`Factory ${challenge.factoryId} not found`);
  }

  const factoryScore = factory.score;
  const won = playerScore > factoryScore;
  let gardChange = 0;
  let burnReduction = 0;

  if (won) {
    // Challenger wins: get reward (ticket was already deducted, so net gain is reward - ticket)
    const reward = calculateWinReward(challenge.ticketCost);
    gardChange = reward; // The challenger gets the reward (ticket already deducted)

    // Mint the reward to challenger
    await walletService.mintGard(challenge.challengerAddress, reward);

    // Log win event
    await walletService.logTokenEvent(
      challenge.challengerAddress,
      'MINT',
      reward,
      'challenge_win',
      challengeId,
      `Won challenge: received ${reward} GARD (ticket: ${challenge.ticketCost})`,
    );
  } else {
    // Challenger loses: ticket is burned
    gardChange = -challenge.ticketCost;
    burnReduction = LOSS_BURN_REDUCTION * challenge.ticketCost;

    // The ticket was already deducted, now mark it as burned
    // We need to update the challenger's totalBurned
    await db
      .update(wallets)
      .set({
        totalBurned: sql`${wallets.totalBurned} + ${challenge.ticketCost}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.address, challenge.challengerAddress));

    // Log burn event
    await walletService.logTokenEvent(
      challenge.challengerAddress,
      'BURN',
      challenge.ticketCost,
      'challenge_loss',
      challengeId,
      `Lost challenge: ${challenge.ticketCost} GARD burned`,
    );
  }

  // Update factory aggregate stats
  await factoryService.updateFactoryAfterChallenge(
    challenge.factoryId,
    won,
    challenge.ticketCost,
  );

  // Update challenge record
  const updatedChallenge = await db
    .update(challenges)
    .set({
      status: 'completed',
      completedAtTime: new Date(),
      playerScore,
      factoryScore,
      won,
      gardChange,
      burnReduction,
    })
    .where(eq(challenges.id, challengeId))
    .returning();

  return {
    challenge: updatedChallenge[0],
    playerScore,
    factoryScore,
    won,
    gardChange,
    burnReduction,
  };
}

/**
 * Complete a challenge by playing the game (random score)
 */
export async function completeChallengeWithGame(
  challengeId: string,
): Promise<CompleteChallengeResult> {
  const playerScore = playGame();
  return completeChallenge(challengeId, playerScore);
}

/**
 * Cancel a pending challenge (refund ticket)
 */
export async function cancelChallenge(challengeId: string): Promise<Challenge> {
  const db = getDb();

  // Get challenge
  const challengeResult = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId));

  if (challengeResult.length === 0) {
    throw new Error(`Challenge ${challengeId} not found`);
  }

  const challenge = challengeResult[0];

  if (challenge.status !== 'pending') {
    throw new Error(
      `Challenge ${challengeId} is not pending (status: ${challenge.status})`,
    );
  }

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
    'challenge_cancel',
    challengeId,
    `Challenge cancelled: ${challenge.ticketCost} GARD refunded`,
  );

  // Update challenge status
  const result = await db
    .update(challenges)
    .set({
      status: 'cancelled',
      completedAtTime: new Date(),
    })
    .where(eq(challenges.id, challengeId))
    .returning();

  return result[0];
}

/**
 * Get challenge by ID
 */
export async function getChallenge(id: string): Promise<Challenge | null> {
  const db = getDb();

  const result = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, id));

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all pending challenges
 */
export async function getPendingChallenges(): Promise<Challenge[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(challenges)
    .where(eq(challenges.status, 'pending'))
    .orderBy(sql`${challenges.createdAtTime} DESC`);

  return result;
}

/**
 * Get pending challenges for a specific factory
 */
export async function getPendingChallengesForFactory(
  factoryId: string,
): Promise<Challenge[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.factoryId, factoryId),
        eq(challenges.status, 'pending'),
      ),
    )
    .orderBy(sql`${challenges.createdAtTime} DESC`);

  return result;
}

/**
 * Get challenges for a challenger
 */
export async function getChallengesForChallenger(
  challengerAddress: string,
): Promise<Challenge[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(challenges)
    .where(eq(challenges.challengerAddress, challengerAddress))
    .orderBy(sql`${challenges.createdAtTime} DESC`);

  return result;
}

/**
 * Get all challenges (optionally filtered)
 */
export async function getChallenges(options?: {
  factoryId?: string;
  challengerAddress?: string;
  status?: 'pending' | 'completed' | 'expired' | 'cancelled';
  limit?: number;
}): Promise<Challenge[]> {
  const db = getDb();

  const conditions = [];
  if (options?.factoryId) {
    conditions.push(eq(challenges.factoryId, options.factoryId));
  }
  if (options?.challengerAddress) {
    conditions.push(
      eq(challenges.challengerAddress, options.challengerAddress),
    );
  }
  if (options?.status) {
    conditions.push(eq(challenges.status, options.status));
  }

  let query = db.select().from(challenges);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  query = query.orderBy(sql`${challenges.createdAtTime} DESC`) as typeof query;

  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  const result = await query;
  return result;
}
