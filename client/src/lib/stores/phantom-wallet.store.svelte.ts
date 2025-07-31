import { PublicKey, Connection } from '@solana/web3.js';
import solData from '$solData';

interface TokenBalance {
  token: Token;
  balance: number;
  balanceUSD: number;
}

interface Token {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  isNative?: boolean;
  images: {
    icon: string;
  };
}

interface PhantomWalletState {
  isConnected: boolean;
  walletAddress: string;
  loading: boolean;
  error: string | null;
  balance: number;
  balanceUSD: number;
  tokenBalances: TokenBalance[];
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
    balance: 0,
    balanceUSD: 0,
    tokenBalances: [],
  });

  private connection: Connection;

  constructor() {
    // Initialize Solana connection to mainnet via QuickNode
    this.connection = new Connection(
      'https://patient-small-butterfly.solana-mainnet.quiknode.pro/46570114ff6dd24edca20437b6a9a6621dfc65e9/',
      'confirmed',
    );
  }

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

  get balance() {
    return this.state.balance;
  }

  get balanceUSD() {
    return this.state.balanceUSD;
  }

  get tokenBalances() {
    return this.state.tokenBalances;
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
        await this.fetchBalance();
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

      await this.fetchBalance();
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
      this.state.balance = 0;
      this.state.balanceUSD = 0;
      this.state.tokenBalances = [];
    } catch (err) {
      console.error('Error disconnecting Phantom:', err);
    }
  }

  async fetchBalance() {
    if (!this.state.isConnected || !this.state.walletAddress) return;

    try {
      const publicKey = new PublicKey(this.state.walletAddress);

      // Fetch prices for all tokens
      const prices = await this.fetchTokenPrices();

      // Process each token
      const balances: TokenBalance[] = [];

      for (const token of solData.availableTokens) {
        let balance = 0;

        if (token.isNative) {
          // Fetch SOL balance
          const lamports = await this.connection.getBalance(publicKey);
          balance = lamports / Math.pow(10, token.decimals);
        } else {
          // Fetch SPL token balance
          try {
            const tokenAccounts =
              await this.connection.getParsedTokenAccountsByOwner(publicKey, {
                mint: new PublicKey(token.address),
              });

            if (tokenAccounts.value.length > 0) {
              const tokenBalance =
                tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
              balance = tokenBalance.uiAmount || 0;
            }
          } catch (err) {
            console.error(`Error fetching balance for ${token.symbol}:`, err);
          }
        }

        const price = prices[token.symbol] || 0;
        balances.push({
          token,
          balance,
          balanceUSD: balance * price,
        });

        // Update native SOL balance separately for backward compatibility
        if (token.isNative) {
          this.state.balance = balance;
          this.state.balanceUSD = balance * price;
        }
      }

      this.state.tokenBalances = balances;
      console.log('Token balances:', balances);
    } catch (err) {
      console.error('Error fetching balances:', err);
      this.state.error = 'Failed to fetch balances';
    }
  }

  private async fetchTokenPrices(): Promise<Record<string, number>> {
    try {
      // Map token symbols to CoinGecko IDs
      const coinGeckoIds: Record<string, string> = {
        SOL: 'solana',
        // Add more mappings as needed for other tokens
      };

      const ids = Object.values(coinGeckoIds).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      );
      const data = await response.json();

      // Map back to token symbols
      const prices: Record<string, number> = {};
      for (const [symbol, geckoId] of Object.entries(coinGeckoIds)) {
        prices[symbol] = data[geckoId]?.usd || 0;
      }

      return prices;
    } catch (err) {
      console.error('Error fetching token prices:', err);
      return {};
    }
  }
}

export const phantomWalletStore = new PhantomWalletStore();
