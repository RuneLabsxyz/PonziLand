import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';

export interface TokenDeduction {
  tokenAddress: string;
  amount: CurrencyAmount;
}

export interface TokenAddition {
  tokenAddress: string;
  amount: CurrencyAmount;
}

/** Result from a transaction execution */
export type TransactionExecuteResult =
  | { transaction_hash?: string; transactionHash?: string }
  | null
  | undefined
  | void;

export interface TransactionConfig {
  /** Function that executes the transaction and returns the result */
  execute: () => Promise<TransactionExecuteResult>;

  /** Token amounts to deduct optimistically before transaction */
  deductions?: TokenDeduction[];

  /** Token amounts to add on success (e.g., swap buy side) */
  additions?: TokenAddition[];

  /** Called when transaction succeeds */
  onSuccess?: (txHash: string) => void | Promise<void>;

  /** Called when transaction fails */
  onError?: (error: Error) => void;

  /** Name for notification (e.g., 'swap', 'buy', 'stake') */
  notificationName?: string;

  /** Optional promise to race against waitForTransaction (e.g., land.wait()) */
  waitForLand?: () => Promise<unknown>;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: Error;
}
