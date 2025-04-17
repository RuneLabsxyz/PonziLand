import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { writable } from 'svelte/store';
import { useAccount } from '$lib/contexts/account.svelte';

export type ClaimEvent = CurrencyAmount;

export const claimQueue = writable<ClaimEvent[]>([]);

let accountManager = $derived(useAccount());

class NotificationQueue {
  public queue: {
    txCount: number;
    pending: boolean;
    txhash: string | null;
    isValid: boolean | null;
  }[] = $state([]);

  private txCount = 0;

  public getQueue() {
    return this.queue;
  }

  public registerNotification() {
    this.txCount++;
    this.queue.push({
      txCount: this.txCount,
      pending: true,
      txhash: null,
      isValid: null,
    });
    return this.queue[this.queue.length - 1];
  }

  public async addNotification(txhash: string | null) {
    const notification = this.registerNotification();
    if (txhash) {
      await accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.waitForTransaction(txhash);
      notification.txhash = txhash;
      notification.isValid = true;
      notification.pending = false;
    } else {
      notification.isValid = false;
      notification.pending = false;
    }

    setTimeout(() => this.removeNotification(notification.txCount), 3600);
  }
  public removeNotification(txCount: number) {
    this.queue = this.queue.filter((n) => n.txCount !== txCount);
  }
}

export const notificationQueue = new NotificationQueue();
