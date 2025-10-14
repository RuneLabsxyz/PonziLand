import data from '../variables/mainnet.json';
import { getTokenPrices, type TokenPrice } from '../utils/requests';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { padAddress } from '../utils';
import { SvelteMap } from 'svelte/reactivity';
import accountState from '../account.svelte';
import { untrack } from 'svelte';
import { ERC20_abi } from '../stores/erc20_abi';
import {
  Contract,
  uint256,
  ProviderInterface,
} from "starknet";
import { getProvider } from './providerConfig';

export const PUBLIC_TOKEN_ENDPOINT = 'https://api.runelabs.xyz/ponziland-mainnet/api/tokens';

export interface Token {
  name: string;
  symbol: string;
  address: string;
  liquidityPoolType: string;
  decimals: number;
  images: {
    skin: string;
    icon: string;
  };
}

interface ApiToken {
  symbol: string;
  address: string;
}

export const PUBLIC_DOJO_RPC_URL = 'https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9';
export const MAX_STAKE = 380n;

const BASE_TOKEN = data.mainCurrencyAddress;
export const baseToken = data.availableTokens.find(
  (token) => token.address === BASE_TOKEN,
)!;

export class WalletStore {
  private cleanup: (() => void) | null = null;
  private provider: ProviderInterface;
  private updateInterval: NodeJS.Timeout | null = null;
  public errorMessage = $state<string | null>(null);
  private balances: SvelteMap<string, CurrencyAmount> = $state(new SvelteMap());
  public tokenPrices: TokenPrice[] = $state([]);
  public availableTokens: Token[] = $state([]);
  public tokenBalances = $derived(
    Array.from(
      this.balances.entries(),
      ([token, balance]) =>
        [this.getToken(token)!, balance] as [Token, CurrencyAmount],
    ),
  );
  public totalBalance = $state<CurrencyAmount | null>(null);

  private readonly BASE_TOKEN = data.mainCurrencyAddress;
  private readonly baseToken = data.availableTokens.find(
    (token) => token.address === this.BASE_TOKEN,
  );

  constructor() {
    // Initialize RPC provider
    this.provider = getProvider(PUBLIC_DOJO_RPC_URL);
    // Initialize with data tokens as default
    this.availableTokens = data.availableTokens;
  }

  public async init() {
    if (this.cleanup != null) {
      return;
    }

    // Fetch tokens on initialization
    await this.fetchTokens();

    $effect(() => {
      // Trigger update when address changes
      if (accountState.address) {
        untrack(() => this.update(accountState.address!));
      }
    });

    // Set up periodic updates (every 30 seconds)
    this.updateInterval = setInterval(() => {
      if (accountState.address) {
        this.update(accountState.address);
      }
    }, 30000);

    this.cleanup = () => {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    };
  }

  private async fetchTokens() {
    try {
      const response = await fetch(PUBLIC_TOKEN_ENDPOINT);
      
      // Check if the response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const apiTokens: ApiToken[] = await response.json();
      
      // Validate the response is an array
      if (!Array.isArray(apiTokens)) {
        throw new Error('Invalid response format from token endpoint');
      }
      
      // Create Token objects from API response
      this.availableTokens = apiTokens.map((apiToken) => {
        // Check if this token exists in the data file to get full details
        const existingToken = data.availableTokens.find(
          (t) => t.address.toLowerCase() === apiToken.address.toLowerCase()
        );
        
        if (existingToken) {
          // Use existing token data if available
          return existingToken;
        }
        
        // Create minimal token object for tokens not in data file
        return {
          name: apiToken.symbol,
          symbol: apiToken.symbol,
          address: apiToken.address,
          liquidityPoolType: '1-2', // default
          decimals: 18, // default for most Starknet tokens
          images: {
            skin: apiToken.symbol.toLowerCase(),
            icon: `/tokens/${apiToken.symbol.toLowerCase()}/icon.svg`
          }
        } as Token;
      });
      
      // Ensure base token is always included
      if (this.baseToken && !this.availableTokens.find(t => t.address === this.baseToken.address)) {
        this.availableTokens.unshift(this.baseToken);
      }
      
      console.log(`Successfully loaded ${this.availableTokens.length} tokens from API`);
    } catch (err) {
      console.error('Error fetching tokens, reverting to data file:', err);
      // Fallback to tokens from data file
      this.availableTokens = data.availableTokens;
      console.log(`Using ${this.availableTokens.length} tokens from data file`);
    }
  }

  public async update(address: string) {
    console.log('Updating wallet balance via RPC');
    this.errorMessage = null;

    try {
      // Fetch token prices first

      // Fetch all token balances via RPC
      await this.fetchAllBalances(address);

      this.tokenPrices = await getTokenPrices();


      // Calculate total balance in base currency
      await this.calculateTotalBalance();
    } catch (err) {
      console.error('Error while fetching balances:', err);
      this.errorMessage = 'Failed to update balances. Please try again.';
    }
  }

  private async fetchAllBalances(accountAddress: string) {
    const balancePromises = this.availableTokens.map(async (token) => {
      try {
        // Create contract instance for each token
        const tokenContract = new Contract(
          ERC20_abi,
          token.address,
          this.provider
        );
        
        // Call balanceOf function with explicit block identifier
        const balanceResult = await tokenContract.call('balanceOf', [accountAddress], {
          blockIdentifier: 'latest'
        });        
        // Convert the balance to BigInt
        // The result is wrapped in an object: { balance: { low: bigint, high: bigint } }
        let balanceValue: bigint;
        if (balanceResult && typeof balanceResult === 'object' && 'balance' in balanceResult) {
          // Extract the balance Uint256 and convert to BigInt
          balanceValue = uint256.uint256ToBN(balanceResult.balance);
        } else {
          console.warn(`Unexpected balance format for ${token.symbol}:`, balanceResult);
          balanceValue = BigInt(0);
        }

        console.log(`Balance for ${token.symbol}: ${balanceValue.toString()}`);

        return {
          token,
          balance: balanceValue
        };
      } catch (error) {
        console.error(`Error fetching balance for ${token.symbol}:`, error);
        return {
          token,
          balance: BigInt(0)
        };
      }
    });

    const balanceResults = await Promise.all(balancePromises);

    // Update the balances map
    for (const { token, balance } of balanceResults) {
      const amount = CurrencyAmount.fromUnscaled(
        balance.toString(),
        token
      );
      this.balances.set(token.address, amount);
    }
  }

  public getBalance(tokenAddress: string): CurrencyAmount | null {
    const token = this.availableTokens.find((t) => t.address === tokenAddress);
    if (!token) return null;

    return (
      this.balances.get(tokenAddress) ?? CurrencyAmount.fromUnscaled('0', token)
    );
  }

  public getPrice(tokenAddress: string): TokenPrice | null {
    const token = this.availableTokens.find((t) => t.address === tokenAddress);
    if (!token) return null;

    return (
      this.tokenPrices.find((p) => {
        return padAddress(p.address) === padAddress(token.address);
      }) ?? null
    );
  }

  /**
   * Convert token amount from one token to another using price data
   */
  public convertTokenAmount(
    fromAmount: CurrencyAmount,
    fromToken: Token,
    toToken: Token,
  ): CurrencyAmount | null {
    if (!fromToken || !toToken) return null;

    // If same token, no conversion needed
    if (padAddress(fromToken.address) === padAddress(toToken.address)) {
      return fromAmount;
    }

    const fromPrice = this.getPrice(fromToken.address);
    const toPrice = this.getPrice(toToken.address);

    if (!fromPrice || !toPrice) {
      return null; // Cannot convert without price data
    }

    // Convert fromAmount to base currency, then to target token
    // fromAmount * (1/fromPrice.ratio) * toPrice.ratio
    const baseValue = fromAmount
      .rawValue()
      .dividedBy(fromPrice.ratio || 1);
    const convertedValue = baseValue.multipliedBy(
      toPrice.ratio || 0,
    );

    return CurrencyAmount.fromScaled(convertedValue.toString(), toToken);
  }

  public get allowedTokens(): Token[] {
    return this.availableTokens.filter((token) => {
      return this.balances.get(token.address) !== null;
    });
  }

  private async calculateTotalBalance() {
    const tokenPrices = this.tokenPrices;

    if (!this.balances.size || !tokenPrices.length) return;

    let totalValue = 0;

    for (const [tokenAddress, balance] of this.balances) {
      if (balance === null) continue;

      const token = this.getToken(tokenAddress)!;

      if (padAddress(token.address) === padAddress(this.BASE_TOKEN)) {
        totalValue += Number(balance.rawValue());
      } else {
        const priceInfo = tokenPrices.find((p) => {
          return padAddress(p.address) == padAddress(token.address);
        });

        if (priceInfo?.ratio !== null && priceInfo) {
          totalValue += Number(
            balance.rawValue().dividedBy(priceInfo.ratio || 0),
          );
        }
      }
    }

    if (this.baseToken) {
      this.totalBalance = CurrencyAmount.fromScaled(
        totalValue.toString(),
        this.baseToken,
      );
    }
  }

  public getToken(tokenAddress: string): Token | null {
    return this.availableTokens.find((t) => t.address === tokenAddress) ?? null;
  }

  public getCapForToken(token: Token): CurrencyAmount {
    return (
      this.convertTokenAmount(
        CurrencyAmount.fromScaled(MAX_STAKE, baseToken),
        baseToken,
        token,
      ) ?? CurrencyAmount.fromUnscaled(0n, baseToken)
    );
  }

  public isWithinCap(amount: CurrencyAmount): boolean {

    const amountInBaseCurrency = this.convertTokenAmount(
      amount,
      amount.getToken()!,
      baseToken,
    );

    console.log(
      'amountInBaseCurrency:',
      amountInBaseCurrency?.toString(),
      'cap:',
      CurrencyAmount.fromScaled(MAX_STAKE, baseToken).toString(),
    );

    return (
      amountInBaseCurrency == null ||
      amountInBaseCurrency
        .rawValue()
        .isLessThan(CurrencyAmount.fromScaled(MAX_STAKE, baseToken).rawValue())
    );
  }

  public destroy() {
    this.cleanup?.();
  }
}

export const walletStore = new WalletStore();