import {
  applyOptimisticDeductions,
  rollbackOptimisticDeductions,
  confirmOptimisticDeductions,
  optimisticallyAddBalance,
} from '$lib/utils/optimistic-balance';
import { notificationQueue } from '$lib/stores/event.store.svelte';
import { useAccount } from '$lib/contexts/account.svelte';
import type { TransactionConfig, TransactionResult } from './types';

/**
 * Check if a transaction receipt indicates success.
 * Handles both Starknet.js receipt formats.
 */
function isTransactionSuccessful(receipt: unknown): boolean {
  if (!receipt || typeof receipt !== 'object') return false;

  // Handle isSuccess() method (newer Starknet.js)
  if ('isSuccess' in receipt && typeof receipt.isSuccess === 'function') {
    return (receipt as { isSuccess: () => boolean }).isSuccess();
  }

  // Handle statusReceipt property (older format)
  if ('statusReceipt' in receipt) {
    return (receipt as { statusReceipt: string }).statusReceipt === 'SUCCEEDED';
  }

  return false;
}

/**
 * Unified transaction executor with optimistic balance updates.
 *
 * Handles:
 * - Optimistic balance deductions/additions
 * - Transaction execution and confirmation
 * - Automatic rollback on failure
 * - Success/failure notifications
 *
 * @example
 * ```typescript
 * const result = await executeTransaction({
 *   execute: () => buyLand(location, setup),
 *   deductions: [{ tokenAddress: token.address, amount }],
 *   notificationName: 'buy',
 *   onSuccess: () => updateLandStore(land),
 * });
 * ```
 */
export async function executeTransaction(
  config: TransactionConfig,
): Promise<TransactionResult> {
  const accountManager = useAccount();
  let optimisticTxId: string | null = null;

  // Apply optimistic deductions before transaction
  if (config.deductions?.length) {
    optimisticTxId = applyOptimisticDeductions(config.deductions);
  }

  try {
    // Execute the transaction
    const result = await config.execute();
    const txHash = result?.transaction_hash;

    if (!txHash) {
      // No transaction hash - rollback and fail
      if (optimisticTxId) rollbackOptimisticDeductions(optimisticTxId);
      const error = new Error('No transaction hash returned');
      config.onError?.(error);
      return { success: false, error };
    }

    // Wait for transaction confirmation
    const txPromise = accountManager
      ?.getProvider()
      ?.getWalletAccount()
      ?.waitForTransaction(txHash);

    // Optionally race against land.wait() for faster UI update
    const receipt = config.waitForLand
      ? await Promise.any([txPromise, config.waitForLand()])
      : await txPromise;

    // Check if transaction succeeded
    const success = isTransactionSuccessful(receipt);

    if (success) {
      // Confirm optimistic deductions
      if (optimisticTxId) confirmOptimisticDeductions(optimisticTxId);

      // Apply optimistic additions (e.g., swap buy side)
      if (config.additions?.length) {
        for (const { tokenAddress, amount } of config.additions) {
          optimisticallyAddBalance(tokenAddress, amount);
        }
      }

      // Send success notification
      if (config.notificationName) {
        notificationQueue.registerSuccessNotification(
          txHash,
          config.notificationName,
        );
      }

      // Call success handler
      await config.onSuccess?.(txHash);

      return { success: true, txHash };
    } else {
      // Transaction failed - rollback
      if (optimisticTxId) rollbackOptimisticDeductions(optimisticTxId);

      // Send failure notification
      if (config.notificationName) {
        notificationQueue.registerFailedNotification(
          txHash,
          config.notificationName,
        );
      }

      const error = new Error('Transaction failed');
      config.onError?.(error);
      return { success: false, txHash, error };
    }
  } catch (error) {
    // Error during execution - rollback
    if (optimisticTxId) rollbackOptimisticDeductions(optimisticTxId);

    const err = error instanceof Error ? error : new Error(String(error));
    config.onError?.(err);
    return { success: false, error: err };
  }
}
