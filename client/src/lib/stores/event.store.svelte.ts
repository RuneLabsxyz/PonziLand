import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { writable } from 'svelte/store';

export type ClaimEvent = CurrencyAmount;

export const claimQueue = writable<ClaimEvent[]>([]);

class NotificationQueue {
  public queue: {
    txCount: number;
    pending: boolean;
    txhash: string | null;
    isValid: boolean | null;
  }[] = $state([]);

  private txCount = 0;

  public addNewNotification() {
    this.txCount++;
    this.queue.push({
      txCount: this.txCount,
      pending: true,
      txhash: null,
      isValid: null,
    });
    return this.txCount;
  }

  public updateNotification(txCount: number, txhash: string) {
    const notification = this.queue.find((n) => n.txCount === txCount);
    let isValid = true;

    if (txhash === null) {
      isValid = false;
    }
    if (notification) {
      notification.pending = false;
      notification.txhash = txhash;
      notification.isValid = isValid;
    }
    setTimeout(this.removeNotification, 3600);
  }
  public removeNotification(txCount: number) {
    this.queue = this.queue.filter((n) => n.txCount !== txCount);
  }
}

export const notificationQueue = new NotificationQueue();
