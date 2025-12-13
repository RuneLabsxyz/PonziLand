// Bridge store - lightweight client-side store that calls ponzixperience API
// NO Hyperlane SDK imports - all SDK operations happen on the server

import { PUBLIC_BRIDGE_API_URL } from '$env/static/public';
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
} from './types';

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

  // Config getters
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

  // Transfer state getters
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
      this.transferState.status !== 'error'
    );
  }

  // Load config from API
  async loadConfig(): Promise<BridgeConfig> {
    // Return cached config if available
    if (this.configState.config) {
      return this.configState.config;
    }

    // Return existing promise if already loading
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

  // Get token balance
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

  // Get quote
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

  // Execute transfer
  async executeTransfer(
    params: TransferParams,
    walletProvider: WalletProvider,
  ): Promise<TransferResult> {
    console.log('[BridgeStore] executeTransfer called with params:', params);

    // Reset state
    this.transferState.status = 'fetching_quote';
    this.transferState.error = null;
    this.transferState.txHashes = [];

    try {
      // 1. Get quote first to check collateral
      console.log('[BridgeStore] Fetching quote...');
      const quote = await this.getQuote(params);
      console.log('[BridgeStore] Quote result:', quote);

      if (!quote.isCollateralSufficient) {
        throw new Error(
          quote.error || 'Insufficient collateral on destination chain',
        );
      }

      // 2. Get unsigned transactions from server
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

      // 3. Sign and send using wallet
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
      this.transferState.status = 'success';

      return {
        success: true,
        txHashes,
      };
    } catch (err) {
      console.error('[BridgeStore] Transfer error:', err);
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
      console.log('Executing Starknet transaction:', tx);

      const result = await account.execute({
        contractAddress: tx.contractAddress,
        entrypoint: tx.entrypoint,
        calldata: tx.calldata,
      });

      const txHash = result.transaction_hash;
      console.log('Transaction hash:', txHash);
      txHashes.push(txHash);
    }

    return txHashes;
  }

  private async signAndSendSolana(
    transactions: SolanaTransaction[],
    sender: string,
    walletProvider: WalletProvider,
  ): Promise<string[]> {
    const wallet = walletProvider.getSolanaWallet();

    if (!wallet || !wallet.isConnected) {
      throw new Error('Solana wallet not connected');
    }

    if (!wallet.publicKey) {
      throw new Error('Solana wallet public key not available');
    }

    const walletAddress = wallet.publicKey.toString();
    if (walletAddress.toLowerCase() !== sender.toLowerCase()) {
      throw new Error('Connected Phantom wallet address does not match sender');
    }

    const txHashes: string[] = [];

    for (const tx of transactions) {
      console.log('Executing Solana transaction');

      // Deserialize the transaction
      const serialized = Buffer.from(tx.serializedTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(serialized);

      // Sign and send via Phantom
      const result = await wallet.signAndSendTransaction(transaction, {
        skipPreflight: false,
      });

      const signature = result.signature;
      console.log('Transaction signature:', signature);
      txHashes.push(signature);
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

// Export singleton instance
export const bridgeStore = new BridgeStore();
