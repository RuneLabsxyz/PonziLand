import { browser } from '$app/environment';
import type { Adapter, WalletName } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
  NightlyWalletAdapter,
} from '@solana/wallet-adapter-wallets';

// Wallet weights for prioritization (higher = more priority)
// Note: Backpack and other Wallet Standard wallets are auto-detected
// and will appear in the list without explicit adapters
export const SolanaWalletWeights: Record<string, number> = {
  Phantom: 50,
  Backpack: 45, // Wallet Standard - auto-detected
  Solflare: 35,
  'Coinbase Wallet': 25,
  Nightly: 20,
  Trust: 15,
};

export type SolanaConnectedEvent = {
  type: 'connected';
  adapter: Adapter;
};

export type SolanaDisconnectedEvent = {
  type: 'disconnected';
};

export type SolanaErrorEvent = {
  type: 'error';
  error: Error;
};

export type SolanaEvent =
  | SolanaConnectedEvent
  | SolanaDisconnectedEvent
  | SolanaErrorEvent;

export type SolanaEventListener = (event: SolanaEvent) => void;

const stubLocalStorage = {
  getItem(_id: string) {
    return null;
  },
  setItem(_id: string, _value: string) {},
  removeItem(_id: string) {},
};

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const localStorage = browser ? window.localStorage : stubLocalStorage;

const previousSolanaWalletSymbol = Symbol('previousSolanaWallet');
// Old phantom key for migration
const OLD_PHANTOM_KEY = 'phantom_auto_connect';

interface SolanaAccountState {
  isConnected: boolean;
  walletAddress: string;
  loading: boolean;
  error: string | null;
}

export class SolanaAccountManager {
  private _adapter?: Adapter;
  private _adapters: Adapter[] = [];
  private _listeners: SolanaEventListener[] = [];
  private _setupPromise: Promise<SolanaAccountManager>;
  private _boundHandleConnect: () => void;
  private _boundHandleDisconnect: () => void;
  private _boundHandleError: (error: Error) => void;

  private _state = $state<SolanaAccountState>({
    isConnected: false,
    walletAddress: '',
    loading: false,
    error: null,
  });

  constructor() {
    this._boundHandleConnect = this.handleConnect.bind(this);
    this._boundHandleDisconnect = this.handleDisconnect.bind(this);
    this._boundHandleError = this.handleError.bind(this);
    this._setupPromise = this.setup();
  }

  // Public reactive getters
  get isConnected() {
    return this._state.isConnected;
  }

  get walletAddress() {
    return this._state.walletAddress;
  }

  get loading() {
    return this._state.loading;
  }

  get error() {
    return this._state.error;
  }

  get publicKey() {
    return this._adapter?.publicKey ?? null;
  }

  get connectedWalletName() {
    return this._adapter?.name ?? null;
  }

  get connectedWalletIcon() {
    return this._adapter?.icon ?? null;
  }

  public listen(listener: SolanaEventListener): () => void {
    this._listeners.push(listener);
    return () => {
      const index = this._listeners.findIndex((e) => e === listener);
      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    };
  }

  public async wait(): Promise<SolanaAccountManager> {
    return await this._setupPromise;
  }

  private async setup(): Promise<SolanaAccountManager> {
    if (!browser) {
      return this;
    }

    // Initialize all adapters
    // Note: Wallet Standard wallets (like Backpack) are detected automatically
    // by the individual adapters that support Wallet Standard
    // Note: LedgerWalletAdapter removed due to Buffer polyfill issues in browser
    this._adapters = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new NightlyWalletAdapter(),
      new TrustWalletAdapter(),
    ];

    // Migrate from old phantom-only storage
    this.migrateFromPhantomStore();

    // Try auto-reconnect
    const previousWallet = localStorage.getItem(
      previousSolanaWalletSymbol.toString(),
    );

    if (previousWallet) {
      console.info(
        '[Solana] Attempting auto-login with wallet:',
        previousWallet,
      );
      try {
        // Add timeout to prevent hanging if wallet extension doesn't respond
        const connected = await withTimeout(
          this.selectAndConnect(previousWallet as WalletName).then(() => true),
          5000,
          false,
        );
        if (!connected) {
          console.warn('[Solana] Auto-login timed out');
        }
      } catch (e) {
        console.error('[Solana] Auto-login failed:', e);
        localStorage.removeItem(previousSolanaWalletSymbol.toString());
      }
    }

    return this;
  }

  private migrateFromPhantomStore() {
    // Check if old phantom key exists and new key doesn't
    const oldValue = localStorage.getItem(OLD_PHANTOM_KEY);
    const newValue = localStorage.getItem(
      previousSolanaWalletSymbol.toString(),
    );

    if (oldValue && !newValue) {
      // Migrate to new format
      localStorage.setItem(previousSolanaWalletSymbol.toString(), 'Phantom');
      localStorage.removeItem(OLD_PHANTOM_KEY);
      console.info('[Solana] Migrated from phantom-only storage');
    }
  }

  public getAvailableWallets(): Adapter[] {
    return this._adapters
      .filter((adapter) => {
        const weight = SolanaWalletWeights[adapter.name] ?? 0;
        return weight > 0;
      })
      .sort((a, b) => {
        const weightA = SolanaWalletWeights[a.name] ?? 0;
        const weightB = SolanaWalletWeights[b.name] ?? 0;
        return weightB - weightA;
      });
  }

  public async selectAndConnect(walletName: WalletName): Promise<void> {
    const adapter = this._adapters.find((a) => a.name === walletName);

    if (!adapter) {
      throw new Error(`Wallet adapter not found: ${walletName}`);
    }

    this._state.loading = true;
    this._state.error = null;

    try {
      // Remove listeners from previous adapter if any
      if (this._adapter) {
        this.removeAdapterListeners(this._adapter);
      }

      this._adapter = adapter;

      // Add listeners to new adapter
      this.addAdapterListeners(adapter);

      // Connect
      await adapter.connect();

      this._state.isConnected = adapter.connected;
      this._state.walletAddress = adapter.publicKey?.toString() ?? '';

      // Store for auto-reconnect
      localStorage.setItem(previousSolanaWalletSymbol.toString(), walletName);

      this._listeners.forEach((listener) =>
        listener({
          type: 'connected',
          adapter,
        }),
      );

      console.info('[Solana] Connected to wallet:', walletName);
    } catch (error) {
      this._state.error =
        error instanceof Error ? error.message : 'Failed to connect wallet';
      console.error('[Solana] Connection error:', error);
      throw error;
    } finally {
      this._state.loading = false;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this._adapter) {
      return;
    }

    try {
      await this._adapter.disconnect();
    } catch (error) {
      console.error('[Solana] Disconnect error:', error);
    }

    this.removeAdapterListeners(this._adapter);

    this._adapter = undefined;
    this._state.isConnected = false;
    this._state.walletAddress = '';

    localStorage.removeItem(previousSolanaWalletSymbol.toString());

    this._listeners.forEach((listener) =>
      listener({
        type: 'disconnected',
      }),
    );

    console.info('[Solana] Disconnected');
  }

  public promptForLogin(): Promise<void> {
    window.dispatchEvent(new Event('solana_wallet_prompt'));

    return new Promise((resolve) => {
      const listener = () => {
        window.removeEventListener('solana_wallet_login_success', listener);
        resolve();
      };
      window.addEventListener('solana_wallet_login_success', listener);
    });
  }

  public getAdapter(): Adapter | undefined {
    return this._adapter;
  }

  private addAdapterListeners(adapter: Adapter) {
    adapter.on('connect', this._boundHandleConnect);
    adapter.on('disconnect', this._boundHandleDisconnect);
    adapter.on('error', this._boundHandleError);
  }

  private removeAdapterListeners(adapter: Adapter) {
    adapter.off('connect', this._boundHandleConnect);
    adapter.off('disconnect', this._boundHandleDisconnect);
    adapter.off('error', this._boundHandleError);
  }

  private handleConnect() {
    if (!this._adapter) return;

    this._state.isConnected = true;
    this._state.walletAddress = this._adapter.publicKey?.toString() ?? '';
  }

  private handleDisconnect() {
    this._state.isConnected = false;
    this._state.walletAddress = '';
  }

  private handleError(error: Error) {
    this._state.error = error.message;
    this._listeners.forEach((listener) =>
      listener({
        type: 'error',
        error,
      }),
    );
  }
}

// Singleton instance
let state = $state<SolanaAccountManager | null>(null);

export function setupSolanaAccount(): Promise<SolanaAccountManager> {
  if (state != null) {
    return state.wait();
  }

  const manager = new SolanaAccountManager();
  state = manager;

  return manager.wait();
}

export function useSolanaAccount(): SolanaAccountManager | null {
  return state;
}
