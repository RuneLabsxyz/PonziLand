import { browser } from '$app/environment';
import bs58 from 'bs58';
import type {
  PendingTransfer,
  RelayStatus,
  HyperlaneMessage,
  TrackTransferParams,
} from './types';

interface TrackerState {
  transfers: Map<string, PendingTransfer>;
  activeTransferId: string | null;
}

class HyperlaneTracker {
  private state = $state<TrackerState>({
    transfers: new Map(),
    activeTransferId: null,
  });

  private pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

  private readonly POLL_INTERVAL = 5000; // 5 seconds
  private readonly TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  private readonly STORAGE_KEY = 'ponziland_pending_bridges';
  private readonly GRAPHQL_URL = 'https://api.hyperlane.xyz/v1/graphql';

  constructor() {
    if (browser) {
      this.loadFromStorage();
    }
  }

  // Public reactive getters
  get activeTransfer(): PendingTransfer | null {
    if (!this.state.activeTransferId) return null;
    return this.state.transfers.get(this.state.activeTransferId) ?? null;
  }

  get allTransfers(): PendingTransfer[] {
    return Array.from(this.state.transfers.values());
  }

  get hasActiveTransfer(): boolean {
    return this.state.activeTransferId !== null;
  }

  get hasPendingTransfers(): boolean {
    return Array.from(this.state.transfers.values()).some(
      (t) =>
        t.status === 'pending_message_id' ||
        t.status === 'relaying' ||
        t.status === 'timeout',
    );
  }

  // Track a new transfer after origin tx is sent
  async trackTransfer(params: TrackTransferParams): Promise<void> {
    const transfer: PendingTransfer = {
      id: params.originTxHash,
      originTxHash: params.originTxHash,
      originChain: params.originChain,
      destinationChain: params.destinationChain,
      tokenSymbol: params.tokenSymbol,
      amount: params.amount,
      sender: params.sender,
      recipient: params.recipient,
      createdAt: Date.now(),
      messageId: null,
      status: 'pending_message_id',
      destinationTxHash: null,
      deliveredAt: null,
    };

    this.state.transfers.set(transfer.id, transfer);
    this.state.activeTransferId = transfer.id;
    this.persistToStorage();
    this.startPolling(transfer.id);
  }

  // Resume tracking pending transfers on page load
  async resumeTracking(): Promise<void> {
    this.loadFromStorage();

    for (const [id, transfer] of this.state.transfers) {
      if (
        transfer.status === 'pending_message_id' ||
        transfer.status === 'relaying' ||
        transfer.status === 'timeout'
      ) {
        // Set active to the most recent pending transfer
        if (
          !this.state.activeTransferId ||
          transfer.createdAt >
            (this.state.transfers.get(this.state.activeTransferId)?.createdAt ??
              0)
        ) {
          this.state.activeTransferId = id;
        }
        this.startPolling(id);
      }
    }
  }

  // Stop tracking a specific transfer
  stopTracking(transferId: string): void {
    this.stopPolling(transferId);
    if (this.state.activeTransferId === transferId) {
      this.state.activeTransferId = null;
    }
  }

  // Clear all completed/error transfers from storage
  clearCompleted(): void {
    for (const [id, transfer] of this.state.transfers) {
      if (transfer.status === 'delivered' || transfer.status === 'error') {
        this.state.transfers.delete(id);
        if (this.state.activeTransferId === id) {
          this.state.activeTransferId = null;
        }
      }
    }
    this.persistToStorage();
  }

  // Reset active transfer (after user acknowledges completion)
  resetActive(): void {
    if (this.state.activeTransferId) {
      const transfer = this.state.transfers.get(this.state.activeTransferId);
      if (transfer?.status === 'delivered' || transfer?.status === 'error') {
        this.state.transfers.delete(this.state.activeTransferId);
        this.state.activeTransferId = null;
        this.persistToStorage();
      }
    }
  }

  // Cleanup on unmount
  destroy(): void {
    for (const id of this.pollingIntervals.keys()) {
      this.stopPolling(id);
    }
  }

  // Convert tx hash to hex format for Hyperlane API
  private txHashToHex(txHash: string): string {
    // Check if it's already hex (starts with 0x)
    if (txHash.startsWith('0x')) {
      // Starknet hex hash - remove 0x and pad to 64 chars
      return txHash.slice(2).padStart(64, '0');
    }

    // Check if it looks like hex (only hex chars)
    if (/^[0-9a-fA-F]+$/.test(txHash)) {
      return txHash.padStart(64, '0');
    }

    // Assume it's base58 (Solana signature) - decode to hex
    try {
      const bytes = bs58.decode(txHash);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      console.error('[Hyperlane] Failed to decode base58:', e);
      return txHash;
    }
  }

  // Query Hyperlane GraphQL for message by origin tx hash
  private async queryMessage(
    originTxHash: string,
  ): Promise<HyperlaneMessage | null> {
    const hexHash = this.txHashToHex(originTxHash);

    // Build query with bytea literal
    const query =
      'query { message_view(where: {origin_tx_hash: {_eq: "\\\\x' +
      hexHash +
      '"}}, limit: 1) { msg_id is_delivered destination_tx_hash send_occurred_at delivery_occurred_at delivery_latency origin_chain_id destination_chain_id } }';

    try {
      const response = await fetch(this.GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (data.errors) {
        console.error('[Hyperlane] GraphQL error:', data.errors);
        return null;
      }

      const message = data.data?.message_view?.[0];
      if (!message) return null;

      // Convert bytea fields to hex strings
      return {
        msg_id: this.byteaToHex(message.msg_id),
        is_delivered: message.is_delivered,
        destination_tx_hash: message.destination_tx_hash
          ? this.byteaToHex(message.destination_tx_hash)
          : null,
        send_occurred_at: message.send_occurred_at,
        delivery_occurred_at: message.delivery_occurred_at,
        delivery_latency: message.delivery_latency,
        origin_chain_id: message.origin_chain_id,
        destination_chain_id: message.destination_chain_id,
      };
    } catch (error) {
      console.error('[Hyperlane] Query failed:', error);
      return null;
    }
  }

  // Convert bytea string to hex
  private byteaToHex(bytea: string): string {
    if (!bytea) return '';
    // If already hex with 0x prefix, return as is
    if (bytea.startsWith('0x')) return bytea;
    // If \x prefix (PostgreSQL bytea), convert to 0x
    if (bytea.startsWith('\\x')) return '0x' + bytea.slice(2);
    // Otherwise assume it's raw hex
    return '0x' + bytea;
  }

  // Start polling for a transfer
  private startPolling(transferId: string): void {
    // Clear any existing interval
    this.stopPolling(transferId);

    const poll = async () => {
      const transfer = this.state.transfers.get(transferId);
      if (!transfer) {
        this.stopPolling(transferId);
        return;
      }

      // Check timeout
      const elapsed = Date.now() - transfer.createdAt;
      if (elapsed >= this.TIMEOUT_MS && transfer.status !== 'timeout') {
        this.updateTransfer(transferId, { status: 'timeout' });
        // Continue polling - bridges can take 30+ min during congestion
      }

      try {
        const message = await this.queryMessage(transfer.originTxHash);

        if (!message) {
          // Message not yet indexed, keep waiting
          return;
        }

        // Update message ID if not set
        if (!transfer.messageId && message.msg_id) {
          this.updateTransfer(transferId, {
            messageId: message.msg_id,
            status: transfer.status === 'timeout' ? 'timeout' : 'relaying',
          });
        }

        // Check delivery status
        if (message.is_delivered) {
          this.updateTransfer(transferId, {
            status: 'delivered',
            destinationTxHash: message.destination_tx_hash,
            deliveredAt: Date.now(),
          });
          this.stopPolling(transferId);

          // Dispatch event for balance refresh
          if (browser) {
            window.dispatchEvent(
              new CustomEvent('bridge_delivered', {
                detail: {
                  transferId,
                  destinationTxHash: message.destination_tx_hash,
                },
              }),
            );
          }
        }
      } catch (error) {
        console.error('[Hyperlane] Polling error:', error);
        // Don't change status on transient errors, keep polling
      }
    };

    // Immediate first poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, this.POLL_INTERVAL);
    this.pollingIntervals.set(transferId, intervalId);
  }

  // Stop polling for a transfer
  private stopPolling(transferId: string): void {
    const intervalId = this.pollingIntervals.get(transferId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(transferId);
    }
  }

  // Update a transfer's fields
  private updateTransfer(
    transferId: string,
    updates: Partial<PendingTransfer>,
  ): void {
    const transfer = this.state.transfers.get(transferId);
    if (!transfer) return;

    const updated = { ...transfer, ...updates };
    this.state.transfers.set(transferId, updated);
    this.persistToStorage();
  }

  // Persist to localStorage
  private persistToStorage(): void {
    if (!browser) return;

    try {
      const transfers = Array.from(this.state.transfers.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transfers));
    } catch (error) {
      console.error('[Hyperlane] Failed to persist transfers:', error);
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    if (!browser) return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const transfers: PendingTransfer[] = JSON.parse(stored);

      for (const transfer of transfers) {
        // Only restore non-terminal transfers or recently completed ones
        if (transfer.status !== 'delivered' && transfer.status !== 'error') {
          this.state.transfers.set(transfer.id, transfer);
        } else if (
          transfer.deliveredAt &&
          Date.now() - transfer.deliveredAt < 60000
        ) {
          // Keep recently delivered transfers for 1 minute so UI can show success
          this.state.transfers.set(transfer.id, transfer);
        }
      }
    } catch (error) {
      console.error('[Hyperlane] Failed to load transfers:', error);
    }
  }
}

export const hyperlaneTracker = new HyperlaneTracker();
