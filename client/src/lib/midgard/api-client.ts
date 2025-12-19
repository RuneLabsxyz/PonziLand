/**
 * Midgard API Client
 * Functions for interacting with the database-backed API
 */

const API_BASE = '/midgard/api';

// Types for API responses
export interface Wallet {
  id: string;
  address: string;
  gardBalance: number;
  lockedBalance: number;
  totalMinted: number;
  totalBurned: number;
  createdAt: string;
  updatedAt: string;
}

export interface Factory {
  id: string;
  landId: string;
  ownerAddress: string;
  stakedGard: number;
  score: number | null;
  status: 'pending' | 'active' | 'closed';
  burnReductions: number;
  inflationPaidOut: number;
  challengeWins: number;
  challengeLosses: number;
  createdAtBlock: number;
  createdAtTime: string;
  closedAtTime?: string;
  closeReason?: string;
}

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

export interface Challenge {
  id: string;
  factoryId: string;
  challengerAddress: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  ticketCost: number;
  potentialReward: number;
  effectiveBurn: number;
  availableInflation: number;
  factoryAgeSeconds: number;
  playerScore?: number;
  factoryScore?: number;
  won?: boolean;
  gardChange?: number;
  createdAtTime: string;
  completedAtTime?: string;
}

export interface SupplyStats {
  totalMinted: number;
  totalBurned: number;
  netSupply: number;
  totalLocked: number;
  totalCirculating: number;
}

export interface TokenEvent {
  id: string;
  eventType: 'LOCK' | 'UNLOCK' | 'MINT' | 'BURN' | 'TRANSFER';
  walletAddress: string;
  amount: number;
  source: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

// Wallet API
export async function createWallet(address: string): Promise<Wallet> {
  const res = await fetch(`${API_BASE}/wallets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create wallet');
  }
  return res.json();
}

export async function getWallet(address: string): Promise<Wallet | null> {
  const res = await fetch(`${API_BASE}/wallets/${address}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get wallet');
  }
  return res.json();
}

export async function getWalletHistory(
  address: string,
  limit = 100,
): Promise<TokenEvent[]> {
  const res = await fetch(
    `${API_BASE}/wallets/${address}/history?limit=${limit}`,
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get wallet history');
  }
  return res.json();
}

// Factory API
export async function createFactory(
  landId: string,
  ownerAddress: string,
  stakedGard: number,
): Promise<Factory> {
  const res = await fetch(`${API_BASE}/factories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ landId, ownerAddress, stakedGard }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create factory');
  }
  return res.json();
}

export async function activateFactory(
  factoryId: string,
  score: number,
): Promise<Factory> {
  const res = await fetch(`${API_BASE}/factories/${factoryId}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to activate factory');
  }
  return res.json();
}

export async function getFactory(factoryId: string): Promise<Factory | null> {
  const res = await fetch(`${API_BASE}/factories/${factoryId}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get factory');
  }
  const data = await res.json();
  return data.factory;
}

export async function getFactoryWithStats(
  factoryId: string,
): Promise<{ factory: Factory; stats: FactoryStats } | null> {
  const res = await fetch(`${API_BASE}/factories/${factoryId}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get factory');
  }
  return res.json();
}

export async function getFactoryStats(
  factoryId: string,
): Promise<FactoryStats | null> {
  const res = await fetch(`${API_BASE}/factories/${factoryId}/stats`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get factory stats');
  }
  return res.json();
}

export async function getFactoryByLand(
  landId: string,
): Promise<Factory | null> {
  const res = await fetch(`${API_BASE}/factories/by-land/${landId}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get factory by land');
  }
  return res.json();
}

export async function getFactories(options?: {
  status?: 'pending' | 'active' | 'closed';
  owner?: string;
}): Promise<Factory[]> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.owner) params.set('owner', options.owner);

  const url = params.toString()
    ? `${API_BASE}/factories?${params}`
    : `${API_BASE}/factories`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get factories');
  }
  return res.json();
}

export async function closeFactory(
  factoryId: string,
  reason: 'burn_exceeded' | 'stake_depleted' | 'manual' = 'manual',
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/factories/${factoryId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to close factory');
  }
  return res.json();
}

// Challenge API
export async function createChallenge(
  factoryId: string,
  challengerAddress: string,
): Promise<Challenge> {
  const res = await fetch(`${API_BASE}/challenges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factoryId, challengerAddress }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create challenge');
  }
  return res.json();
}

export async function completeChallenge(
  challengeId: string,
  playerScore: number,
): Promise<Challenge> {
  const res = await fetch(`${API_BASE}/challenges/${challengeId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerScore }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to complete challenge');
  }
  return res.json();
}

export async function cancelChallenge(challengeId: string): Promise<Challenge> {
  const res = await fetch(`${API_BASE}/challenges/${challengeId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to cancel challenge');
  }
  return res.json();
}

export async function getChallenge(
  challengeId: string,
): Promise<Challenge | null> {
  const res = await fetch(`${API_BASE}/challenges/${challengeId}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get challenge');
  }
  return res.json();
}

export async function getPendingChallenges(): Promise<Challenge[]> {
  const res = await fetch(`${API_BASE}/challenges/pending`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get pending challenges');
  }
  return res.json();
}

export async function getFactoryChallenges(
  factoryId: string,
): Promise<Challenge[]> {
  const res = await fetch(`${API_BASE}/factories/${factoryId}/challenges`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get factory challenges');
  }
  return res.json();
}

// Stats API
export async function getSupplyStats(): Promise<SupplyStats> {
  const res = await fetch(`${API_BASE}/stats/supply`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get supply stats');
  }
  return res.json();
}
