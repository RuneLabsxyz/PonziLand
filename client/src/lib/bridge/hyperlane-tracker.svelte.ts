import { browser } from '$app/environment';
import bs58 from 'bs58';
import type {
  PendingTransfer,
  HyperlaneMessage,
  TrackTransferParams,
} from './types';

class HyperlaneTracker {
  private transfer = $state<PendingTransfer | null>(null);
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  private readonly POLL_INTERVAL = 5000; // 5 seconds
  private readonly TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  private readonly GRAPHQL_URL = 'https://api.hyperlane.xyz/v1/graphql';

  get activeTransfer(): PendingTransfer | null {
    return this.transfer;
  }

  async trackTransfer(params: TrackTransferParams): Promise<void> {
    // Stop any existing tracking
    this.stopPolling();

    this.transfer = {
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

    this.startPolling();
  }

  resetActive(): void {
    if (
      this.transfer?.status === 'delivered' ||
      this.transfer?.status === 'error'
    ) {
      this.stopPolling();
      this.transfer = null;
    }
  }

  destroy(): void {
    this.stopPolling();
  }

  private txHashToHex(txHash: string): string {
    if (txHash.startsWith('0x')) {
      return txHash.slice(2).padStart(64, '0');
    }

    if (/^[0-9a-fA-F]+$/.test(txHash)) {
      return txHash.padStart(64, '0');
    }

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

  private async queryMessage(
    originTxHash: string,
  ): Promise<HyperlaneMessage | null> {
    const hexHash = this.txHashToHex(originTxHash).toLowerCase();
    const byteaHash = '\\x' + hexHash;

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

    const requestId = Date.now().toString();

    try {
      const response = await fetch(this.GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
          Pragma: 'no-cache',
          'X-Request-Id': requestId,
        },
        cache: 'no-store',
        body: JSON.stringify({
          query: query + `\n# ${requestId}`,
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

  private byteaToHex(bytea: string): string {
    if (!bytea) return '';
    if (bytea.startsWith('0x')) return bytea;
    if (bytea.startsWith('\\x')) return '0x' + bytea.slice(2);
    return '0x' + bytea;
  }

  private startPolling(): void {
    this.stopPolling();

    const poll = async () => {
      if (!this.transfer) {
        this.stopPolling();
        return;
      }

      const elapsed = Date.now() - this.transfer.createdAt;
      if (elapsed >= this.TIMEOUT_MS && this.transfer.status !== 'timeout') {
        this.transfer = { ...this.transfer, status: 'timeout' };
      }

      try {
        const message = await this.queryMessage(this.transfer.originTxHash);

        if (!message) return;

        if (!this.transfer.messageId && message.msg_id) {
          this.transfer = {
            ...this.transfer,
            messageId: message.msg_id,
            status: this.transfer.status === 'timeout' ? 'timeout' : 'relaying',
          };
        }

        if (message.is_delivered) {
          const destinationChain = this.transfer.destinationChain;
          this.transfer = {
            ...this.transfer,
            status: 'delivered',
            destinationTxHash: message.destination_tx_hash,
            deliveredAt: Date.now(),
          };
          this.stopPolling();

          if (browser) {
            window.dispatchEvent(
              new CustomEvent('bridge_delivered', {
                detail: {
                  transferId: this.transfer.id,
                  destinationChain,
                  destinationTxHash: message.destination_tx_hash,
                },
              }),
            );
          }
        }
      } catch (error) {
        console.error('[Hyperlane] Polling error:', error);
      }
    };

    poll();
    this.pollingInterval = setInterval(poll, this.POLL_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export const hyperlaneTracker = new HyperlaneTracker();
