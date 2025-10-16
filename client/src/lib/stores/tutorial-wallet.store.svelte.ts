export interface TutorialToken {
  name: string;
  symbol: string;
  balance: number;
  decimals: number;
  contractAddress: string;
}

export class TutorialWalletStore {
  // Mock wallet state
  isConnected = $state(true);
  address = $state('0x1234567890abcdef1234567890abcdef12345678');

  // Mock token balances
  tokens = $state<TutorialToken[]>([
    {
      name: 'Lords',
      symbol: 'LORDS',
      balance: 10000,
      decimals: 18,
      contractAddress: '0xmock_lords',
    },
    {
      name: 'Ethereum',
      symbol: 'ETH',
      balance: 5,
      decimals: 18,
      contractAddress: '0xmock_eth',
    },
  ]);

  selectedToken = $state<TutorialToken | null>(null);

  constructor() {
    // Default to LORDS token
    this.selectedToken = this.tokens[0];
  }

  // Get token balance
  getTokenBalance(symbol: string): number {
    const token = this.tokens.find((t) => t.symbol === symbol);
    return token?.balance ?? 0;
  }

  // Spend tokens (for tutorial actions)
  spendTokens(symbol: string, amount: number): boolean {
    const tokenIndex = this.tokens.findIndex((t) => t.symbol === symbol);
    if (tokenIndex === -1) return false;

    const token = this.tokens[tokenIndex];
    if (token.balance < amount) return false;

    // Update balance
    this.tokens[tokenIndex] = {
      ...token,
      balance: token.balance - amount,
    };

    return true;
  }

  // Add tokens (for rewards)
  addTokens(symbol: string, amount: number): void {
    const tokenIndex = this.tokens.findIndex((t) => t.symbol === symbol);
    if (tokenIndex === -1) return;

    const token = this.tokens[tokenIndex];
    this.tokens[tokenIndex] = {
      ...token,
      balance: token.balance + amount,
    };
  }

  // Select a token for transactions
  selectToken(symbol: string): void {
    this.selectedToken = this.tokens.find((t) => t.symbol === symbol) || null;
  }

  // Reset wallet to initial state
  reset(): void {
    this.tokens = [
      {
        name: 'Lords',
        symbol: 'LORDS',
        balance: 10000,
        decimals: 18,
        contractAddress: '0xmock_lords',
      },
      {
        name: 'Ethereum',
        symbol: 'ETH',
        balance: 5,
        decimals: 18,
        contractAddress: '0xmock_eth',
      },
    ];
    this.selectedToken = this.tokens[0];
  }
}

export const tutorialWalletStore = new TutorialWalletStore();
