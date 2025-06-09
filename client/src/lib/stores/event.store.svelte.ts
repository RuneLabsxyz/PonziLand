import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { writable } from 'svelte/store';
import { useAccount } from '$lib/contexts/account.svelte';
import { sendError } from '$lib/monitoring/faro';

export type ClaimEvent = CurrencyAmount;

export const claimQueue = writable<ClaimEvent[]>([]);

let accountManager = $derived(useAccount());

class NotificationQueue {
  public queue: {
    txCount: number;
    pending: boolean;
    txhash: string | null;
    isValid: boolean | null;
    functionName: string;
  }[] = $state([]);

  private txCount = 0;

  public getQueue() {
    return this.queue;
  }

  public registerNotification(functionName: string) {
    this.txCount++;
    this.queue.push({
      txCount: this.txCount,
      pending: true,
      txhash: null,
      isValid: null,
      functionName,
    });
    return this.queue[this.queue.length - 1];
  }

  public async addNotification(txhash: string | null, functionName: string) {
    const notification = this.registerNotification(functionName);
    if (txhash) {
      const res = await accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.waitForTransaction(txhash);
      console.log('waitForTransaction', res);
      notification.txhash = txhash;
      notification.isValid = res?.isSuccess() ?? false;
      notification.pending = false;
    } else {
      notification.isValid = false;
      notification.pending = false;
    }

    if (!notification.isValid) {
      sendError(
        new Error(`Transaction failed for ${notification.functionName}`),
        {
          txhash: notification.txhash,
          address: accountManager?.getProvider()?.getWalletAccount()?.address,
        },
      );
    }

    setTimeout(() => this.removeNotification(notification.txCount), 3600);
  }
  public removeNotification(txCount: number) {
    this.queue = this.queue.filter((n) => n.txCount !== txCount);
  }
}

export const notificationQueue = new NotificationQueue();
