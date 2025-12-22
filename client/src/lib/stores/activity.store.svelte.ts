import type { Location } from '$lib/api/land/location';
import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import type { TokenSkin } from '$lib/tokens';

// Activity event types
export type ActivityEventType = 'land_buy' | 'auction_win' | 'nuke';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: Date;
  location: Location;
  locationString: string;
  buyer?: string;
  seller?: string;
  price?: CurrencyAmount;
  token?: TokenSkin;
  ownerNuked?: string;
}

// Configuration for the activity store
export interface ActivityConfig {
  maxEvents: number;
  toastDuration: number;
  maxToasts: number;
  toastsEnabled: boolean;
}

const DEFAULT_CONFIG: ActivityConfig = {
  maxEvents: 200,
  toastDuration: 5000,
  maxToasts: 3,
  toastsEnabled: true,
};

class ActivityStore {
  // Reactive state using Svelte 5 $state
  private _events = $state<ActivityEvent[]>([]);
  private _toasts = $state<ActivityEvent[]>([]);
  private _config = $state<ActivityConfig>({ ...DEFAULT_CONFIG });

  // Event ID set for deduplication
  private eventIdSet = new Set<string>();

  // Toast timeout tracking
  private toastTimeouts = new Map<string, NodeJS.Timeout>();

  // Public reactive state accessors
  public readonly events = $derived(this._events);
  public readonly toasts = $derived(this._toasts);
  public readonly config = $derived(this._config);
  public readonly isEmpty = $derived(this._events.length === 0);

  /**
   * Add a new activity event
   */
  public addEvent(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void {
    const id = `${Date.now()}_${event.location.x}_${event.location.y}_${event.type}`;

    // Check for duplicate
    if (this.eventIdSet.has(id)) {
      return;
    }

    const fullEvent: ActivityEvent = {
      ...event,
      id,
      timestamp: new Date(),
    };

    // Add to events list
    this.eventIdSet.add(id);
    this._events = [fullEvent, ...this._events];

    // Trim if exceeds max
    if (this._events.length > this._config.maxEvents) {
      const removed = this._events.pop();
      if (removed) {
        this.eventIdSet.delete(removed.id);
      }
    }

    // Show toast if enabled
    if (this._config.toastsEnabled) {
      this.showToast(fullEvent);
    }
  }

  /**
   * Show a toast notification for an event
   */
  private showToast(event: ActivityEvent): void {
    // Remove oldest toast if at max
    if (this._toasts.length >= this._config.maxToasts) {
      const oldest = this._toasts[this._toasts.length - 1];
      this.dismissToast(oldest.id);
    }

    // Add to toasts
    this._toasts = [event, ...this._toasts];

    // Set auto-dismiss timeout
    const timeout = setTimeout(() => {
      this.dismissToast(event.id);
    }, this._config.toastDuration);

    this.toastTimeouts.set(event.id, timeout);
  }

  /**
   * Dismiss a toast by ID
   */
  public dismissToast(id: string): void {
    // Clear timeout if exists
    const timeout = this.toastTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.toastTimeouts.delete(id);
    }

    // Remove from toasts
    this._toasts = this._toasts.filter((t) => t.id !== id);
  }

  /**
   * Clear all toasts
   */
  public clearAllToasts(): void {
    // Clear all timeouts
    for (const timeout of this.toastTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.toastTimeouts.clear();
    this._toasts = [];
  }

  /**
   * Enable or disable toast notifications
   */
  public setToastsEnabled(enabled: boolean): void {
    this._config = { ...this._config, toastsEnabled: enabled };
    if (!enabled) {
      this.clearAllToasts();
    }
  }

  /**
   * Clear all events and toasts
   */
  public clear(): void {
    this.clearAllToasts();
    this._events = [];
    this.eventIdSet.clear();
  }
}

export const activityStore = new ActivityStore();
