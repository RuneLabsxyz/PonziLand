import type { AccountInterface } from 'starknet';
import type { VersionedTransaction, Transaction } from '@solana/web3.js';

// Chain and token types from API
export interface ChainInfo {
  name: string;
  chainId: string | number;
  protocol: 'ethereum' | 'sealevel' | 'starknet';
  displayName?: string;
}

export interface TokenInfo {
  chainName: string;
  symbol: string;
  name: string;
  decimals: number;
  addressOrDenom: string;
  standard: string;
  logoURI?: string;
}

export interface SupportedRoute {
  sourceChain: string;
  destChain: string;
  tokens: string[];
}

export interface BridgeConfig {
  chains: ChainInfo[];
  tokens: TokenInfo[];
  supportedRoutes: SupportedRoute[];
}

export interface TokenBalance {
  amount: string;
  formatted: string;
  decimals: number;
  symbol: string;
}

export interface QuoteResult {
  isCollateralSufficient: boolean;
  estimatedFees?: {
    interchainFee: string;
    localFee: string;
    totalFee: string;
    feeCurrency: string;
  };
  error?: string;
}

// Transaction types
export interface StarknetTransaction {
  type: 'starknet';
  contractAddress: string;
  entrypoint: string;
  calldata: string[];
}

export interface SolanaTransaction {
  type: 'solana';
  serializedTransaction: string;
}

export type UnsignedTransaction = StarknetTransaction | SolanaTransaction;

export type ChainType = 'starknet' | 'solana';

export interface TransferTransactionsResponse {
  transactions: UnsignedTransaction[];
  chainType: ChainType;
  originChain: string;
  destinationChain: string;
}

// Transfer params
export interface TransferParams {
  originChain: string;
  destinationChain: string;
  tokenSymbol: string;
  amount: string;
  sender: string;
  recipient: string;
}

export type TransferStatus =
  | 'idle'
  | 'fetching_config'
  | 'fetching_quote'
  | 'building_tx'
  | 'signing'
  | 'sending'
  | 'success'
  | 'error'
  // Relay tracking states
  | 'relaying'
  | 'delivered'
  | 'relay_timeout'
  | 'relay_error';

// Hyperlane relay tracking status
export type RelayStatus =
  | 'pending_message_id' // Waiting to resolve msg_id from origin tx
  | 'relaying' // msg_id found, awaiting delivery
  | 'delivered' // is_delivered = true
  | 'timeout' // 15 min elapsed without delivery
  | 'error'; // GraphQL or relay error

// Persisted transfer record for tracking
export interface PendingTransfer {
  id: string; // Unique ID (origin_tx_hash)
  originTxHash: string;
  originChain: string;
  destinationChain: string;
  tokenSymbol: string;
  amount: string;
  sender: string;
  recipient: string;
  createdAt: number; // Unix timestamp
  messageId: string | null; // Resolved from Hyperlane GraphQL
  status: RelayStatus;
  destinationTxHash: string | null;
  deliveredAt: number | null;
}

// Hyperlane GraphQL message response
export interface HyperlaneMessage {
  msg_id: string;
  is_delivered: boolean;
  destination_tx_hash: string | null;
  send_occurred_at: string | null;
  delivery_occurred_at: string | null;
  delivery_latency: number | null;
  origin_chain_id: number;
  destination_chain_id: number;
}

// Parameters for starting transfer tracking
export interface TrackTransferParams {
  originTxHash: string;
  originChain: string;
  destinationChain: string;
  tokenSymbol: string;
  amount: string;
  sender: string;
  recipient: string;
}

export interface TransferResult {
  success: boolean;
  txHashes: string[];
  error?: string;
}

// Wallet provider interface - generic Solana wallet adapter interface
export interface SolanaWalletAdapter {
  connected: boolean;
  publicKey: { toString(): string } | null;
  signAndSendTransaction(
    transaction: VersionedTransaction | Transaction,
    options?: { skipPreflight?: boolean },
  ): Promise<{ signature: string }>;
  signTransaction?<T extends VersionedTransaction | Transaction>(
    transaction: T,
  ): Promise<T>;
  signAllTransactions?<T extends VersionedTransaction | Transaction>(
    transactions: T[],
  ): Promise<T[]>;
}

/** @deprecated Use SolanaWalletAdapter instead */
export interface PhantomProvider {
  isConnected: boolean;
  publicKey: { toString(): string } | null;
  signAndSendTransaction(
    transaction: unknown,
    options?: { skipPreflight?: boolean },
  ): Promise<{ signature: string }>;
}

export interface WalletProvider {
  getStarknetAccount(): AccountInterface | null;
  getSolanaWallet(): SolanaWalletAdapter | null;
}

// API error response
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
