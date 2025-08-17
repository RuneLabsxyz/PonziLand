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
        // No account connected in Phantom
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

    // Avoid silently reconnecting immediately after an explicit user disconnect
    if (this.skipAutoReconnect) return;

    // Check if already connected (on page refresh) without prompting
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

  async connect() {
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

      // Ensure a fresh connect flow that prompts the user
      const resp = await provider.connect({ onlyIfTrusted: false });
      this.state.walletAddress = resp.publicKey.toString();
      this.state.isConnected = true;
      this.skipAutoReconnect = false;

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
      // Prevent initialize() from auto-reconnecting in this session
      this.skipAutoReconnect = true;
    } catch (err) {
      console.error('Error disconnecting Phantom:', err);
    }
  }
}

export const phantomWalletStore = new PhantomWalletStore();