import { PublicKey, Connection } from '@solana/web3.js';

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

  async initialize() {
    const provider = this.getProvider();
    if (!provider) {
      this.state.error =
        'Phantom wallet not found. Please install Phantom wallet extension.';
      return;
    }

    // Check if already connected (on page refresh)
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

      const resp = await provider.connect();
      this.state.walletAddress = resp.publicKey.toString();
      this.state.isConnected = true;

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
    } catch (err) {
      console.error('Error disconnecting Phantom:', err);
    }
  }
}

export const phantomWalletStore = new PhantomWalletStore();