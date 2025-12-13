import type { AccountInterface } from 'starknet';

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
  | 'error';

export interface TransferResult {
  success: boolean;
  txHashes: string[];
  error?: string;
}

// Wallet provider interface
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
  getSolanaWallet(): PhantomProvider | null;
}

// API error response
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
