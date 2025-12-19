import { eq, sql } from 'drizzle-orm';
import { getDb, wallets, tokenEvents } from '../db';
import type { Wallet, NewWallet, TokenEvent, NewTokenEvent } from '../db';

export type TokenEventType = 'LOCK' | 'UNLOCK' | 'MINT' | 'BURN' | 'TRANSFER';

/**
 * Get or create a wallet by address
 */
export async function getOrCreateWallet(address: string): Promise<Wallet> {
  const db = getDb();

  // Try to find existing wallet
  const existing = await db
    .select()
    .from(wallets)
    .where(eq(wallets.address, address));

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new wallet
  const newWallet: NewWallet = {
    address,
    gardBalance: 0,
    lockedBalance: 0,
    totalMinted: 0,
    totalBurned: 0,
  };

  const inserted = await db.insert(wallets).values(newWallet).returning();
  return inserted[0];
}

/**
 * Get wallet by address
 */
export async function getWallet(address: string): Promise<Wallet | null> {
  const db = getDb();

  const result = await db
    .select()
    .from(wallets)
    .where(eq(wallets.address, address));

  return result.length > 0 ? result[0] : null;
}

/**
 * Update wallet GARD balance
 */
export async function updateGardBalance(
  address: string,
  delta: number,
): Promise<Wallet> {
  const db = getDb();

  const result = await db
    .update(wallets)
    .set({
      gardBalance: sql`${wallets.gardBalance} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.address, address))
    .returning();

  return result[0];
}

/**
 * Update wallet locked balance
 */
export async function updateLockedBalance(
  address: string,
  delta: number,
): Promise<Wallet> {
  const db = getDb();

  const result = await db
    .update(wallets)
    .set({
      lockedBalance: sql`${wallets.lockedBalance} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.address, address))
    .returning();

  return result[0];
}

/**
 * Lock GARD from wallet (move from gard balance to locked balance)
 */
export async function lockGard(
  address: string,
  amount: number,
): Promise<Wallet> {
  const db = getDb();

  const result = await db
    .update(wallets)
    .set({
      gardBalance: sql`${wallets.gardBalance} - ${amount}`,
      lockedBalance: sql`${wallets.lockedBalance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.address, address))
    .returning();

  return result[0];
}

/**
 * Unlock GARD to wallet (move from locked balance to gard balance)
 */
export async function unlockGard(
  address: string,
  amount: number,
): Promise<Wallet> {
  const db = getDb();

  const result = await db
    .update(wallets)
    .set({
      gardBalance: sql`${wallets.gardBalance} + ${amount}`,
      lockedBalance: sql`${wallets.lockedBalance} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.address, address))
    .returning();

  return result[0];
}

/**
 * Mint GARD to wallet
 */
export async function mintGard(
  address: string,
  amount: number,
): Promise<Wallet> {
  const db = getDb();

  const result = await db
    .update(wallets)
    .set({
      gardBalance: sql`${wallets.gardBalance} + ${amount}`,
      totalMinted: sql`${wallets.totalMinted} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.address, address))
    .returning();

  return result[0];
}

/**
 * Burn GARD from wallet
 */
export async function burnGard(
  address: string,
  amount: number,
): Promise<Wallet> {
  const db = getDb();

  const result = await db
    .update(wallets)
    .set({
      gardBalance: sql`${wallets.gardBalance} - ${amount}`,
      totalBurned: sql`${wallets.totalBurned} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.address, address))
    .returning();

  return result[0];
}

/**
 * Log a token event
 */
export async function logTokenEvent(
  walletAddress: string,
  eventType: TokenEventType,
  amount: number,
  source: string,
  referenceId?: string,
  description?: string,
  txHash?: string,
): Promise<TokenEvent> {
  const db = getDb();

  const newEvent: NewTokenEvent = {
    eventType,
    walletAddress,
    amount,
    source,
    referenceId: referenceId ?? null,
    description: description ?? null,
    txHash: txHash ?? null,
  };

  const result = await db.insert(tokenEvents).values(newEvent).returning();
  return result[0];
}

/**
 * Get wallet token events history
 */
export async function getWalletHistory(
  address: string,
  limit = 100,
): Promise<TokenEvent[]> {
  const db = getDb();

  const result = await db
    .select()
    .from(tokenEvents)
    .where(eq(tokenEvents.walletAddress, address))
    .orderBy(sql`${tokenEvents.createdAt} DESC`)
    .limit(limit);

  return result;
}

/**
 * Get all token events (optionally filtered by type)
 */
export async function getTokenEvents(
  eventType?: TokenEventType,
  limit = 100,
): Promise<TokenEvent[]> {
  const db = getDb();

  let query = db.select().from(tokenEvents);

  if (eventType) {
    query = query.where(eq(tokenEvents.eventType, eventType)) as typeof query;
  }

  const result = await query
    .orderBy(sql`${tokenEvents.createdAt} DESC`)
    .limit(limit);

  return result;
}

/**
 * Get total supply stats
 */
export async function getSupplyStats(): Promise<{
  totalMinted: number;
  totalBurned: number;
  netSupply: number;
  totalLocked: number;
  totalCirculating: number;
}> {
  const db = getDb();

  const result = await db
    .select({
      totalMinted: sql<number>`COALESCE(SUM(${wallets.totalMinted}), 0)`,
      totalBurned: sql<number>`COALESCE(SUM(${wallets.totalBurned}), 0)`,
      totalLocked: sql<number>`COALESCE(SUM(${wallets.lockedBalance}), 0)`,
      totalCirculating: sql<number>`COALESCE(SUM(${wallets.gardBalance}), 0)`,
    })
    .from(wallets);

  const stats = result[0];
  return {
    totalMinted: stats.totalMinted,
    totalBurned: stats.totalBurned,
    netSupply: stats.totalMinted - stats.totalBurned,
    totalLocked: stats.totalLocked,
    totalCirculating: stats.totalCirculating,
  };
}
