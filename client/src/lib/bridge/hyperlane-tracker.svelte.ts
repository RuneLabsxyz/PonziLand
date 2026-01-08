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
  private readonly GRAPHQL_URL = 'https://api.hyperlane.xyz/v1/graphql';

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
    this.state.transfers = new Map(this.state.transfers); // Trigger reactivity
    this.state.activeTransferId = transfer.id;
    this.startPolling(transfer.id);
  }

  // Stop tracking a specific transfer
  stopTracking(transferId: string): void {
    this.stopPolling(transferId);
    if (this.state.activeTransferId === transferId) {
      this.state.activeTransferId = null;
    }
  }

  // Reset active transfer (after user acknowledges completion)
  resetActive(): void {
    if (this.state.activeTransferId) {
      const transfer = this.state.transfers.get(this.state.activeTransferId);
      if (transfer?.status === 'delivered' || transfer?.status === 'error') {
        this.state.transfers.delete(this.state.activeTransferId);
        this.state.transfers = new Map(this.state.transfers); // Trigger reactivity
        this.state.activeTransferId = null;
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
    const hexHash = this.txHashToHex(originTxHash).toLowerCase();
    const byteaHash = '\\x' + hexHash; // single backslash in the JSON value

    // Use variables instead of string concatenation (no escaping footguns)
    const query = `
    query MessageByOriginTx($h: bytea!) {
      message_view(where: { origin_tx_hash: { _eq: $h } }, limit: 1) {
        msg_id
        is_delivered
        destination_tx_hash
        send_occurred_at
        delivery_occurred_at
        delivery_latency
        origin_chain_id
        destination_chain_id
      }
    }
  `;

    const url = `${this.GRAPHQL_URL}`;

    const requestId = Date.now().toString();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
          Pragma: 'no-cache',
          // Some CDNs vary cache by headers; making this unique can also help
          'X-Request-Id': requestId,
        },
        cache: 'no-store',
        body: JSON.stringify({
          query: query + `\n# ${requestId}`, // harmless GraphQL comment
          variables: { h: byteaHash },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        console.error('[Hyperlane] GraphQL error:', data.errors);
        return null;
      }

      const message = data.data?.message_view?.[0];
      if (!message) return null;

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

          // Dispatch event for destination wallet refresh
          if (browser) {
            window.dispatchEvent(
              new CustomEvent('bridge_delivered', {
                detail: {
                  transferId,
                  destinationChain: transfer.destinationChain,
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
    this.state.transfers = new Map(this.state.transfers); // Trigger reactivity
  }
}

export const hyperlaneTracker = new HyperlaneTracker();
