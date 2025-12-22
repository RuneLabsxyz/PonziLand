import { walletStore } from '$lib/stores/wallet.svelte';
import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import type { TokenDeduction } from '$lib/transactions/types';

/**
 * Generate a unique transaction ID for tracking optimistic updates
 */
export function generateOptimisticTxId(): string {
  return `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Apply optimistic balance deductions for a pending transaction.
 * Validates all deductions can succeed before applying any to prevent partial state.
 * @returns Transaction ID for rollback/confirmation, or null if any deduction would fail
 */
export function applyOptimisticDeductions(
  deductions: TokenDeduction[],
): string | null {
  // First pass: validate all deductions can succeed
  for (const { tokenAddress, amount } of deductions) {
    if (amount.rawValue().isZero()) continue;

    const currentBalance = walletStore.getBalance(tokenAddress);
    if (!currentBalance || currentBalance.rawValue().lt(amount.rawValue())) {
      return null; // Fail early, no partial state
    }
  }

  // Second pass: apply all deductions (guaranteed to succeed)
  const txId = generateOptimisticTxId();
  for (const { tokenAddress, amount } of deductions) {
    if (amount.rawValue().isZero()) continue;

    walletStore.optimisticallyDeductBalance(txId, tokenAddress, amount);
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
