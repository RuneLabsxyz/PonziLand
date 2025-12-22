import { walletStore } from '$lib/stores/wallet.svelte';
import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';

export interface TokenDeduction {
  tokenAddress: string;
  amount: CurrencyAmount;
}

/**
 * Generate a unique transaction ID for tracking optimistic updates
 */
export function generateOptimisticTxId(): string {
  return `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Apply optimistic balance deductions for a pending transaction
 * @returns Transaction ID for rollback/confirmation, or null if any deduction fails
 */
export function applyOptimisticDeductions(
  deductions: TokenDeduction[],
): string | null {
  const txId = generateOptimisticTxId();

  for (const { tokenAddress, amount } of deductions) {
    if (amount.rawValue().isZero()) continue;

    const success = walletStore.optimisticallyDeductBalance(
      txId,
      tokenAddress,
      amount,
    );

    if (!success) {
      // Rollback any successful deductions in this batch
      walletStore.rollbackOptimisticUpdate(txId);
      return null;
    }
  }

  return txId;
}

/**
 * Rollback optimistic deductions after transaction failure
 */
export function rollbackOptimisticDeductions(txId: string): void {
  walletStore.rollbackOptimisticUpdate(txId);
}

/**
 * Confirm optimistic deductions after transaction success
 */
export function confirmOptimisticDeductions(txId: string): void {
  walletStore.confirmOptimisticUpdate(txId);
}

/**
 * Optimistically add balance (e.g., for swap buy side)
 */
export function optimisticallyAddBalance(
  tokenAddress: string,
  amount: CurrencyAmount,
): void {
  walletStore.optimisticallyAddBalance(tokenAddress, amount);
}
