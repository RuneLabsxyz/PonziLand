/**
 * @deprecated This file is deprecated. Use solana-account.svelte.ts instead.
 * The new implementation supports multiple Solana wallets (Phantom, Backpack, Solflare, etc.)
 * via the @solana/wallet-adapter library.
 *
 * Migration:
 * - Replace `import { phantomWalletStore }` with `import { useSolanaAccount }`
 * - Replace `phantomWalletStore.connect()` with `solanaAccount.promptForLogin()`
 * - Replace `phantomWalletStore.isConnected` with `solanaAccount.isConnected`
 * - Replace `phantomWalletStore.walletAddress` with `solanaAccount.walletAddress`
 */
import { PublicKey } from '@solana/web3.js';

interface PhantomWalletState {
  isConnected: boolean;
  walletAddress: string;
  loading: boolean;
  error: string | null;
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean;
  isPhantom?: boolean;
  connect: (opts?: {
    onlyIfTrusted?: boolean;
  }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (
    event: 'connect' | 'disconnect' | 'accountChanged',
    handler: (...args: any[]) => void,
  ) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  signIn?: (opts?: {
    domain?: string;
    statement?: string;
    nonce?: string;
  }) => Promise<{ publicKey: PublicKey }>;
}

declare global {
  interface Window {
    solana?: any;
  }
}

class PhantomWalletStore {
  private state = $state<PhantomWalletState>({
    isConnected: false,
    walletAddress: '',
    loading: false,
    error: null,
  });

  private listenersRegistered = false;
  private skipAutoReconnect = false;
  private forcePromptNextConnect = false;

  get isConnected() {
    return this.state.isConnected;
  }

  get walletAddress() {
    return this.state.walletAddress;
  }

  get loading() {
    return this.state.loading;
  }

  get error() {
    return this.state.error;
  }

  private getProvider(): PhantomProvider | undefined {
    if ('solana' in window) {
      const provider = window.solana;
      if (provider?.isPhantom) {
        return provider as PhantomProvider;
      }
    }
    return undefined;
  }

  private registerEventListeners(provider: PhantomProvider) {
    if (this.listenersRegistered) return;

    provider.on('connect', () => {
      this.state.isConnected = true;
      this.state.walletAddress = provider.publicKey?.toString() ?? '';
    });

    provider.on('disconnect', () => {
      this.state.isConnected = false;
      this.state.walletAddress = '';
    });

    provider.on('accountChanged', (publicKey: PublicKey | null) => {
      if (publicKey) {
        this.state.walletAddress = publicKey.toString();
        this.state.isConnected = true;
      } else {
        this.state.walletAddress = '';
        this.state.isConnected = false;
      }
    });

    this.listenersRegistered = true;
  }

  async initialize() {
    const provider = this.getProvider();
    if (!provider) {
      this.state.error =
        'Phantom wallet not found. Please install Phantom wallet extension.';
      return;
    }

    this.registerEventListeners(provider);

    if (this.skipAutoReconnect) return;

    try {
      const resp = await provider.connect({ onlyIfTrusted: true });
      if (resp.publicKey) {
        this.state.walletAddress = resp.publicKey.toString();
        this.state.isConnected = true;
      }
    } catch {
      // Not connected, which is fine
    }
  }

  async connect(options?: { forcePrompt?: boolean }) {
    this.state.loading = true;
    this.state.error = null;

    try {
      const provider = this.getProvider();
      if (!provider) {
        throw new Error(
          'Phantom wallet not found. Please install Phantom wallet extension.',
        );
      }

      this.registerEventListeners(provider);

      const shouldForcePrompt = Boolean(
        options?.forcePrompt || this.forcePromptNextConnect,
      );

      if (shouldForcePrompt && typeof provider.signIn === 'function') {
        try {
          const resp = await provider.signIn({
            domain:
              typeof window !== 'undefined'
                ? window.location.hostname
                : undefined,
            statement: 'Select an account to connect to this app.',
          });
          if (resp?.publicKey) {
            this.state.walletAddress = resp.publicKey.toString();
            this.state.isConnected = true;
            this.skipAutoReconnect = false;
            this.forcePromptNextConnect = false;

            try {
              await provider.connect({ onlyIfTrusted: false });
            } catch {
              /* ignore */
            }

            return true;
          }
        } catch (promptErr) {
          console.error('Phantom signIn failed:', promptErr);
        }
      }

      const resp = await provider.connect({ onlyIfTrusted: false });
      this.state.walletAddress = resp.publicKey.toString();
      this.state.isConnected = true;
      this.skipAutoReconnect = false;
      this.forcePromptNextConnect = false;

      return true;
    } catch (err) {
      this.state.error =
        err instanceof Error ? err.message : 'Failed to connect wallet';
      console.error('Error connecting Phantom:', err);
      return false;
    } finally {
      this.state.loading = false;
    }
  }

  async disconnect() {
    try {
      const provider = this.getProvider();
      if (provider) {
        await provider.disconnect();
      }

      this.state.isConnected = false;
      this.state.walletAddress = '';
      this.skipAutoReconnect = true;
      this.forcePromptNextConnect = true;
    } catch (err) {
      console.error('Error disconnecting Phantom:', err);
    }
  }
}

export const phantomWalletStore = new PhantomWalletStore();
