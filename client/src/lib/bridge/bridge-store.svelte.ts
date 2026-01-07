import { PUBLIC_BRIDGE_API_URL } from '$env/static/public';
import { Buffer } from 'buffer';
import { VersionedTransaction } from '@solana/web3.js';
import type {
  BridgeConfig,
  TokenBalance,
  QuoteResult,
  TransferParams,
  TransferResult,
  TransferStatus,
  WalletProvider,
  StarknetTransaction,
  SolanaTransaction,
  TransferTransactionsResponse,
  ApiError,
  RelayStatus,
} from './types';
import { hyperlaneTracker } from './hyperlane-tracker.svelte';

const BRIDGE_API_URL = PUBLIC_BRIDGE_API_URL || 'http://localhost:3000';

interface BridgeState {
  config: BridgeConfig | null;
  isLoading: boolean;
  error: string | null;
}

interface TransferState {
  status: TransferStatus;
  error: string | null;
  txHashes: string[];
}

function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === 'object' && response !== null && 'error' in response
  );
}

class BridgeStore {
  private configState = $state<BridgeState>({
    config: null,
    isLoading: false,
    error: null,
  });

  private transferState = $state<TransferState>({
    status: 'idle',
    error: null,
    txHashes: [],
  });

  private configPromise: Promise<BridgeConfig> | null = null;

  get config() {
    return this.configState.config;
  }

  get isConfigLoading() {
    return this.configState.isLoading;
  }

  get configError() {
    return this.configState.error;
  }

  get isReady() {
    return this.configState.config !== null;
  }

  get transferStatus() {
    return this.transferState.status;
  }

  get transferError() {
    return this.transferState.error;
  }

  get txHashes() {
    return this.transferState.txHashes;
  }

  get isLoading() {
    return (
      this.transferState.status !== 'idle' &&
      this.transferState.status !== 'success' &&
      this.transferState.status !== 'error' &&
      this.transferState.status !== 'delivered'
    );
  }

  // Hyperlane relay tracking getters
  get relayStatus(): RelayStatus | null {
    return hyperlaneTracker.activeTransfer?.status ?? null;
  }

  get isRelaying(): boolean {
    const status = this.relayStatus;
    return status === 'pending_message_id' || status === 'relaying';
  }

  get isDelivered(): boolean {
    return this.relayStatus === 'delivered';
  }

  get isRelayTimeout(): boolean {
    return this.relayStatus === 'timeout';
  }

  get destinationTxHash(): string | null {
    return hyperlaneTracker.activeTransfer?.destinationTxHash ?? null;
  }

  get activeTransfer() {
    return hyperlaneTracker.activeTransfer;
  }

  // Reset relay tracking state
  resetRelay(): void {
    hyperlaneTracker.resetActive();
  }

  // Resume tracking on page load
  resumeTracking(): void {
    hyperlaneTracker.resumeTracking();
  }

  // Cleanup on unmount
  destroyTracker(): void {
    hyperlaneTracker.destroy();
  }

  async loadConfig(): Promise<BridgeConfig> {
    if (this.configState.config) {
      return this.configState.config;
    }

    if (this.configPromise) {
      return this.configPromise;
    }

    this.configState.isLoading = true;
    this.configState.error = null;

    this.configPromise = (async () => {
      try {
        const response = await fetch(`${BRIDGE_API_URL}/api/bridge/config`);
        const data = await response.json();

        if (isApiError(data)) {
          throw new Error(data.error.message);
        }

        this.configState.config = data as BridgeConfig;
        return this.configState.config;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load bridge config';
        this.configState.error = message;
        throw err;
      } finally {
        this.configState.isLoading = false;
        this.configPromise = null;
      }
    })();

    return this.configPromise;
  }

  async getBalance(
    chainName: string,
    tokenSymbol: string,
    address: string,
  ): Promise<TokenBalance | null> {
    try {
      const response = await fetch(`${BRIDGE_API_URL}/api/bridge/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainName, tokenSymbol, address }),
      });

      const data = await response.json();

      if (isApiError(data)) {
        console.error('Balance error:', data.error.message);
        return null;
      }

      return data as TokenBalance;
    } catch (err) {
      console.error('Error fetching balance:', err);
      return null;
    }
  }

  async getQuote(
    params: Omit<TransferParams, 'recipient'>,
  ): Promise<QuoteResult> {
    try {
      const response = await fetch(`${BRIDGE_API_URL}/api/bridge/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (isApiError(data)) {
        return {
          isCollateralSufficient: false,
          error: data.error.message,
        };
      }

      return data as QuoteResult;
    } catch (err) {
      return {
        isCollateralSufficient: false,
        error: err instanceof Error ? err.message : 'Failed to get quote',
      };
    }
  }

  async executeTransfer(
    params: TransferParams,
    walletProvider: WalletProvider,
  ): Promise<TransferResult> {
    this.transferState.status = 'fetching_quote';
    this.transferState.error = null;
    this.transferState.txHashes = [];

    try {
      const quote = await this.getQuote(params);

      if (!quote.isCollateralSufficient) {
        throw new Error(
          quote.error || 'Insufficient collateral on destination chain',
        );
      }

      this.transferState.status = 'building_tx';

      const response = await fetch(
        `${BRIDGE_API_URL}/api/bridge/transactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        },
      );

      const txData = await response.json();

      if (isApiError(txData)) {
        throw new Error(txData.error.message);
      }

      const { transactions, chainType } =
        txData as TransferTransactionsResponse;

      this.transferState.status = 'signing';

      let txHashes: string[];
      if (chainType === 'starknet') {
        txHashes = await this.signAndSendStarknet(
          transactions as StarknetTransaction[],
          params.sender,
          walletProvider,
        );
      } else if (chainType === 'solana') {
        txHashes = await this.signAndSendSolana(
          transactions as SolanaTransaction[],
          params.sender,
          walletProvider,
        );
      } else {
        throw new Error(`Unsupported chain type: ${chainType}`);
      }

      this.transferState.txHashes = txHashes;

      // Start Hyperlane tracking for cross-chain relay
      if (txHashes.length > 0) {
        hyperlaneTracker.trackTransfer({
          originTxHash: txHashes[0],
          originChain: params.originChain,
          destinationChain: params.destinationChain,
          tokenSymbol: params.tokenSymbol,
          amount: params.amount,
          sender: params.sender,
          recipient: params.recipient,
        });
      }

      this.transferState.status = 'relaying';

      return {
        success: true,
        txHashes,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.transferState.error = errorMessage;
      this.transferState.status = 'error';

      return {
        success: false,
        txHashes: this.transferState.txHashes,
        error: errorMessage,
      };
    }
  }

  private async signAndSendStarknet(
    transactions: StarknetTransaction[],
    sender: string,
    walletProvider: WalletProvider,
  ): Promise<string[]> {
    const account = walletProvider.getStarknetAccount();

    if (!account) {
      throw new Error('Starknet wallet not connected');
    }

    if (account.address.toLowerCase() !== sender.toLowerCase()) {
      throw new Error('Connected wallet address does not match sender');
    }

    const txHashes: string[] = [];

    for (const tx of transactions) {
      const result = await account.execute({
        contractAddress: tx.contractAddress,
        entrypoint: tx.entrypoint,
        calldata: tx.calldata,
      });
      txHashes.push(result.transaction_hash);
    }

    return txHashes;
  }

  private async signAndSendSolana(
    transactions: SolanaTransaction[],
    sender: string,
    walletProvider: WalletProvider,
  ): Promise<string[]> {
    const wallet = walletProvider.getSolanaWallet();

    if (!wallet || !wallet.connected) {
      throw new Error('Solana wallet not connected');
    }

    if (!wallet.publicKey) {
      throw new Error('Solana wallet public key not available');
    }

    const walletAddress = wallet.publicKey.toString();
    if (walletAddress.toLowerCase() !== sender.toLowerCase()) {
      throw new Error('Connected Solana wallet address does not match sender');
    }

    const txHashes: string[] = [];

    for (const tx of transactions) {
      const serialized = Buffer.from(tx.serializedTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(serialized);
      const result = await wallet.signAndSendTransaction(transaction, {
        skipPreflight: false,
      });
      txHashes.push(result.signature);
    }

    return txHashes;
  }

  clearError() {
    this.transferState.error = null;
  }

  reset() {
    this.transferState.status = 'idle';
    this.transferState.error = null;
    this.transferState.txHashes = [];
  }
}

export const bridgeStore = new BridgeStore();
