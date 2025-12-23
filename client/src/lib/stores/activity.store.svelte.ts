import type { Location } from '$lib/api/land/location';
import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import type { TokenSkin } from '$lib/tokens';
import {
  getRecentActivity,
  type ActivityEventResponse,
} from '$lib/api/activity';
import { getTokenMetadata } from '$lib/tokens';
import { getTokenInfo } from '$lib/utils';
import { CurrencyAmount as CA } from '$lib/utils/CurrencyAmount';

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
  private _isLoading = $state(false);
  private _hasLoadedInitial = $state(false);

  // Event ID set for deduplication
  private eventIdSet = new Set<string>();

  // Toast timeout tracking
  private toastTimeouts = new Map<string, NodeJS.Timeout>();

  // Public reactive state accessors
  public readonly events = $derived(this._events);
  public readonly toasts = $derived(this._toasts);
  public readonly config = $derived(this._config);
  public readonly isEmpty = $derived(this._events.length === 0);
  public readonly isLoading = $derived(this._isLoading);

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

  /**
   * Load initial events from Torii
   */
  public async loadInitialEvents(limit: number = 50): Promise<void> {
    if (this._hasLoadedInitial || this._isLoading) {
      return;
    }

    this._isLoading = true;

    try {
      const events = await getRecentActivity(limit);

      // Convert API events to ActivityEvent format
      const activityEvents: ActivityEvent[] = events
        .map((event) => this.convertApiEvent(event))
        .filter((e): e is ActivityEvent => e !== null);

      // Add events in reverse order (oldest first) so newest ends up at top
      const newEvents = [];
      for (const event of activityEvents.reverse()) {
        if (!this.eventIdSet.has(event.id)) {
          this.eventIdSet.add(event.id);
          newEvents.push(event);
        }
      }
      this._events = [...this._events, ...newEvents];
      // Sort events by timestamp descending (newest first)
      this._events = this._events.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      // Trim if exceeds max
      if (this._events.length > this._config.maxEvents) {
        const removed = this._events.slice(this._config.maxEvents);
        this._events = this._events.slice(0, this._config.maxEvents);
        for (const event of removed) {
          this.eventIdSet.delete(event.id);
        }
      }

      this._hasLoadedInitial = true;
    } catch (err) {
      console.error('Failed to load initial activity events:', err);
    } finally {
      this._isLoading = false;
    }
  }

  /**
   * Convert API event to ActivityEvent format
   */
  private convertApiEvent(event: ActivityEventResponse): ActivityEvent | null {
    try {
      const location: Location = { x: event.location_x, y: event.location_y };

      // Get token info from address
      const token = event.token_used
        ? getTokenInfo(event.token_used)
        : undefined;

      // Get token skin metadata from the token's skin name
      const tokenMeta = token?.skin ? getTokenMetadata(token.skin) : undefined;

      let price: CurrencyAmount | undefined;
      if (event.price && token) {
        try {
          // Use fromUnscaled since contract returns raw values (like wei)
          price = CA.fromUnscaled(event.price, token);
        } catch {
          // Ignore price parsing errors
        }
      }

      return {
        id: event.id,
        type: event.type,
        timestamp: new Date(event.timestamp),
        location,
        locationString: `${event.location_x}, ${event.location_y}`,
        buyer: event.buyer,
        seller: event.seller,
        price,
        token: tokenMeta ?? undefined,
        ownerNuked: event.owner_nuked,
      };
    } catch {
      return null;
    }
  }
}

export const activityStore = new ActivityStore();
