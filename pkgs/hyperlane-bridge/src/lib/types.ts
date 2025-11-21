// types.ts - Public types for the hyperlane-bridge package
import type { AccountInterface } from 'starknet';

// Solana Phantom wallet provider interface
export interface PhantomProvider {
  publicKey: { toString(): string } | null;
  isConnected: boolean;
  signTransaction<T extends { serialize(): Uint8Array }>(transaction: T): Promise<T>;
  signAllTransactions<T extends { serialize(): Uint8Array }>(transactions: T[]): Promise<T[]>;
  signAndSendTransaction<T extends { serialize(): Uint8Array }>(
    transaction: T,
    options?: { skipPreflight?: boolean }
  ): Promise<{ signature: string }>;
}

/**
 * Wallet provider interface
 * Implementations should provide methods to get wallet accounts/signers
 */
export interface WalletProvider {
  /**
   * Get Starknet account for transaction signing
   */
  getStarknetAccount(): AccountInterface | null;

  /**
   * Get Solana Phantom wallet provider for transaction signing
   * This should return window.solana or the provider from phantomWalletStore
   */
  getSolanaWallet(): PhantomProvider | null;
}

/**
 * Parameters for a cross-chain token transfer
 */
export interface TransferParams {
  originChain: string;
  destinationChain: string;
  tokenSymbol: string;
  amount: string;
  recipient: string;
  sender: string;
}

/**
 * Transfer status during execution
 */
export type TransferStatus = 'idle' | 'preparing' | 'approving' | 'transferring' | 'success' | 'error';

/**
 * Result of a transfer execution
 */
export interface TransferResult {
  success: boolean;
  txHashes: string[];
  error?: string;
}

/**
 * Chain type classification
 */
export type ChainType = 'starknet' | 'solana';

// Re-export Hyperlane SDK types so consumers don't need to import them directly
export type { Token, TokenAmount } from '@hyperlane-xyz/sdk';