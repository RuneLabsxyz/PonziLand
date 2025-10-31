import { PUBLIC_DOJO_TORII_URL } from '$env/static/public';
import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { getTokenInfo } from '$lib/utils';
import { CurrencyAmount as CurrencyAmountClass } from '$lib/utils/CurrencyAmount';
import { toLocation, type Location } from '$lib/api/land/location';

// Base event fields common to all events
interface BaseHistoryEvent {
  id: string;
  modelName: string;
  createdAt: number;
  timestamp: Date;
  accountAddress: string;
}

// Specific event types as a discriminated union
export interface LandBoughtHistoryEvent extends BaseHistoryEvent {
  type: 'LandBoughtEvent';
  seller: string;
  buyer: string;
  soldPrice: bigint;
  tokenUsed: string;
  amount: CurrencyAmount;
  isSale: boolean; // true if account is seller, false if buyer
  landLocation: Location;
}

export interface LandNukedHistoryEvent extends BaseHistoryEvent {
  type: 'LandNukedEvent';
  ownerNuked: string;
  landLocation: Location;
}

// Union type for all possible events
export type HistoryEvent = LandBoughtHistoryEvent | LandNukedHistoryEvent;

// Configuration for the history store
export interface HistoryConfig {
  pageSize: number;
  maxEvents: number; // Maximum events to keep in memory
}

const DEFAULT_CONFIG: HistoryConfig = {
  pageSize: 50,
  maxEvents: 1000,
};

export class AccountHistory {
  // Reactive state using Svelte 5 $state
  private _accountAddress = $state<string | null>(null);
  private _events = $state<HistoryEvent[]>([]);
  private _loading = $state<boolean>(false);
  private _error = $state<string | null>(null);
  private _hasMore = $state<boolean>(true);
  private _lastUpdate = $state<number>(0);
  private _totalEvents = $state<number>(0);
  private _isInitialized = $state<boolean>(false);

  // Non-reactive internal state
  private config: HistoryConfig;
  private eventIdSet = new Set<string>(); // To prevent duplicates
  private oldestTimestamp: number | null = null; // For pagination
  private newestTimestamp: number | null = null; // For new events

  // Public reactive state accessors
  public readonly accountAddress = $derived(this._accountAddress);
  public readonly events = $derived(this._events);
  public readonly loading = $derived(this._loading);
  public readonly error = $derived(this._error);
  public readonly hasMore = $derived(this._hasMore);
  public readonly lastUpdate = $derived(this._lastUpdate);
  public readonly isEmpty = $derived(this._events.length === 0);
  public readonly totalEvents = $derived(this._totalEvents);
  public readonly isInitialized = $derived(this._isInitialized);

  // Derived statistics
  public readonly stats = $derived(() => {
    const stats = {
      totalEvents: this._events.length,
      landsBought: 0,
      landsSold: 0,
      landsNuked: 0,
      totalVolume: 0n,
    };

    for (const event of this._events) {
      switch (event.type) {
        case 'LandBoughtEvent':
          if (event.isSale) {
            stats.landsSold++;
          } else {
            stats.landsBought++;
          }
          stats.totalVolume += event.soldPrice;
          break;
        case 'LandNukedEvent':
          stats.landsNuked++;
          break;
      }
    }

    return stats;
  });

  constructor(config: Partial<HistoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // React to account address changes
    $effect.root(() => {
      $effect(() => {
        const address = this._accountAddress;
        if (address) {
          // Account changed, reload data
          this.loadInitial();
        } else if (this._isInitialized) {
          // Account was cleared, reset
          this.reset();
        }
      });
    });
  }

  /**
   * Set or change the account address
   * This will automatically trigger a data refresh
   */
  public setAccount(accountAddress: string | null): void {
    if (this._accountAddress !== accountAddress) {
      // Reset state when changing accounts
      if (this._accountAddress && accountAddress) {
        this.reset();
      }
      this._accountAddress = accountAddress;
    }
  }

  /**
   * Load initial events
   */
  private async loadInitial(): Promise<void> {
    if (!this._accountAddress) {
      this._error = 'No account address set';
      return;
    }

    this._loading = true;
    this._error = null;

    try {
      // Fetch initial batch
      const initialEvents = await this.fetchEvents(
        this._accountAddress,
        null, // No timestamp constraint for initial load
        this.config.pageSize,
      );

      if (initialEvents.length > 0) {
        // Set timestamps for pagination
        this.newestTimestamp = Math.max(
          ...initialEvents.map((e) => e.createdAt),
        );
        this.oldestTimestamp = Math.min(
          ...initialEvents.map((e) => e.createdAt),
        );

        // Add events
        this.mergeEvents(initialEvents, false);

        // Check if there might be more
        this._hasMore = initialEvents.length === this.config.pageSize;
      } else {
        this._hasMore = false;
      }

      this._lastUpdate = Date.now();
      this._isInitialized = true;
    } catch (error) {
      console.error('Failed to load initial history:', error);
      this._error =
        error instanceof Error ? error.message : 'Failed to fetch history';
    } finally {
      this._loading = false;
    }
  }

  /**
   * Fetch new events that occurred after the newest event we have
   */
  public async fetchNewEvents(): Promise<void> {
    if (!this._accountAddress) {
      this._error = 'No account address set';
      return;
    }

    if (this._loading) {
      return; // Prevent concurrent fetches
    }

    this._loading = true;
    this._error = null;

    try {
      // Fetch events newer than our newest
      const newEvents = await this.fetchEvents(
        this._accountAddress,
        this.newestTimestamp ? { after: this.newestTimestamp } : null,
        this.config.pageSize,
      );

      if (newEvents.length > 0) {
        // Update newest timestamp
        this.newestTimestamp = Math.max(
          this.newestTimestamp || 0,
          ...newEvents.map((e) => e.createdAt),
        );

        // Prepend new events
        this.mergeEvents(newEvents, true);
      }

      this._lastUpdate = Date.now();
    } catch (error) {
      console.error('Failed to fetch new events:', error);
      this._error =
        error instanceof Error ? error.message : 'Failed to fetch new events';
    } finally {
      this._loading = false;
    }
  }

  /**
   * Load more events (pagination - older events)
   */
  public async loadMore(): Promise<void> {
    if (!this._accountAddress || !this._hasMore || this._loading) {
      return;
    }

    this._loading = true;

    try {
      // Fetch events older than our oldest
      const moreEvents = await this.fetchEvents(
        this._accountAddress,
        this.oldestTimestamp ? { before: this.oldestTimestamp } : null,
        this.config.pageSize,
      );

      if (moreEvents.length > 0) {
        // Update oldest timestamp
        this.oldestTimestamp = Math.min(
          this.oldestTimestamp || Number.MAX_SAFE_INTEGER,
          ...moreEvents.map((e) => e.createdAt),
        );

        // Append older events
        this.mergeEvents(moreEvents, false);
      }

      // Check if we've reached the end
      this._hasMore = moreEvents.length === this.config.pageSize;
    } catch (error) {
      console.error('Failed to load more history:', error);
      this._error =
        error instanceof Error ? error.message : 'Failed to load more';
    } finally {
      this._loading = false;
    }
  }

  /**
   * Build the SQL query for fetching events
   */
  private buildQuery(
    address: string,
    timestampConstraint: { before?: number; after?: number } | null,
    limit: number,
  ): string {
    let whereClause = `
      WHERE
        (em.data ->> '$.seller') = '${address}'
        OR (em.data ->> '$.owner_nuked') = '${address}'
    `;

    // Add timestamp constraints for pagination
    if (timestampConstraint) {
      if (timestampConstraint.before !== undefined) {
        whereClause += ` AND em.created_at < ${timestampConstraint.before}`;
      }
      if (timestampConstraint.after !== undefined) {
        whereClause += ` AND em.created_at > ${timestampConstraint.after}`;
      }
    }

    return `
      SELECT
        em.id as id,
        m.name as model_name,
        em.created_at as created_at,
        -- Common
        (em.data ->> '$.buyer') as buyer,
        (em.data ->> '$.land_location') as location,
        -- Land bought event
        (em.data ->> '$.seller') as seller,
        (em.data ->> '$.sold_price') as sold_price,
        (em.data ->> '$.token_used') as token_used,
        -- Land nuked event
        (em.data ->> '$.owner_nuked') as owner
      FROM event_messages_historical em
      LEFT JOIN models m ON em.model_id = m.id
      ${whereClause}
      ORDER BY em.created_at DESC
      LIMIT ${limit}
    `;
  }

  /**
   * Fetch events from the Torii SQL endpoint
   */
  private async fetchEvents(
    address: string,
    timestampConstraint: { before?: number; after?: number } | null,
    limit: number,
  ): Promise<HistoryEvent[]> {
    const query = this.buildQuery(address, timestampConstraint, limit);

    try {
      const response = await fetch(`${PUBLIC_DOJO_TORII_URL}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: query,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.error('Invalid response format:', data);
        return [];
      }

      // Parse and transform events
      return data
        .map((raw) => this.parseEvent(raw))
        .filter(Boolean) as HistoryEvent[];
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
  }

  /**
   * Parse raw event data into typed events
   */
  private parseEvent(raw: any): HistoryEvent | null {
    try {
      // Extract type from model name
      const modelParts = raw.model_name?.split('::') || [];
      const eventType = modelParts[modelParts.length - 1] || 'UnknownEvent';

      // Created at is a string, like 2025-10-07 06:30:58
      const timestamp = new Date(raw.created_at); // Convert to milliseconds

      // Create base event properties
      const baseEvent = {
        id:
          raw.id ||
          `${timestamp.getTime()}_${eventType}_${this._accountAddress}`,
        modelName: raw.model_name,
        createdAt: timestamp.getTime(),
        timestamp,
        accountAddress: this._accountAddress!,
      };

      // Create specific event based on type
      if (eventType === 'LandBoughtEvent') {
        const token = raw.token_used ? getTokenInfo(raw.token_used) : null;
        const soldPrice = BigInt(raw.sold_price || 0);
        const landLocation = toLocation(raw.location || 0);

        return {
          ...baseEvent,
          type: 'LandBoughtEvent',
          seller: raw.seller,
          buyer: raw.buyer,
          soldPrice,
          tokenUsed: raw.token_used,
          amount: token
            ? CurrencyAmountClass.fromUnscaled(soldPrice, token)
            : CurrencyAmountClass.fromUnscaled(0, getTokenInfo('0x0')!),
          isSale: raw.seller === this._accountAddress, // True if account sold
          landLocation,
        } as LandBoughtHistoryEvent;
      } else if (eventType === 'LandNukedEvent') {
        const landLocation = toLocation(raw.location || 0);

        return {
          ...baseEvent,
          type: 'LandNukedEvent',
          ownerNuked: raw.owner,
          landLocation,
        } as LandNukedHistoryEvent;
      }

      // Unknown event type
      return null;
    } catch (error) {
      console.error('Failed to parse event:', error, raw);
      return null;
    }
  }

  /**
   * Merge new events with existing ones, maintaining immutability
   */
  private mergeEvents(newEvents: HistoryEvent[], prepend: boolean): void {
    // Filter out duplicates
    const uniqueNewEvents = newEvents.filter((event) => {
      if (this.eventIdSet.has(event.id)) {
        return false;
      }
      this.eventIdSet.add(event.id);
      return true;
    });

    if (uniqueNewEvents.length === 0) {
      return;
    }

    // Create new array to maintain immutability
    if (prepend) {
      // New events go at the top
      this._events = [...uniqueNewEvents, ...this._events];
    } else {
      // Append for pagination
      this._events = [...this._events, ...uniqueNewEvents];
    }

    // Sort by timestamp to ensure proper order
    this._events.sort((a, b) => b.createdAt - a.createdAt);

    // Update total count
    this._totalEvents = this._events.length;

    // Trim array if it exceeds max size
    if (this._events.length > this.config.maxEvents) {
      const trimmedEvents = this._events.slice(0, this.config.maxEvents);
      // Update the ID set to match
      this.eventIdSet = new Set(trimmedEvents.map((e) => e.id));
      this._events = trimmedEvents;

      // Update oldest timestamp to reflect trimmed data
      if (trimmedEvents.length > 0) {
        this.oldestTimestamp =
          trimmedEvents[trimmedEvents.length - 1].createdAt;
      }
    }
  }

  /**
   * Reset the history state
   */
  public reset(): void {
    this._events = [];
    this._loading = false;
    this._error = null;
    this._hasMore = true;
    this._lastUpdate = 0;
    this._totalEvents = 0;
    this._isInitialized = false;
    this.oldestTimestamp = null;
    this.newestTimestamp = null;
    this.eventIdSet.clear();
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.reset();
    this._accountAddress = null;
  }

  /**
   * Get events filtered by type
   */
  public getEventsByType<T extends HistoryEvent['type']>(
    type: T,
  ): Extract<HistoryEvent, { type: T }>[] {
    return this._events.filter(
      (event): event is Extract<HistoryEvent, { type: T }> =>
        event.type === type,
    );
  }

  /**
   * Get only land bought events where account was buyer
   */
  public getBoughtEvents(): LandBoughtHistoryEvent[] {
    return this._events.filter(
      (event): event is LandBoughtHistoryEvent =>
        event.type === 'LandBoughtEvent' && !event.isSale,
    );
  }

  /**
   * Get only land sold events where account was seller
   */
  public getSoldEvents(): LandBoughtHistoryEvent[] {
    return this._events.filter(
      (event): event is LandBoughtHistoryEvent =>
        event.type === 'LandBoughtEvent' && event.isSale,
    );
  }

  /**
   * Get only nuke events
   */
  public getNukeEvents(): LandNukedHistoryEvent[] {
    return this.getEventsByType('LandNukedEvent');
  }
}

// Singleton instance for global use
export const accountHistory = new AccountHistory();
