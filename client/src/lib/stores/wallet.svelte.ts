import { useDojo } from '$lib/contexts/dojo';
import type { Subscription, TokenBalance } from '@dojoengine/torii-client';
import data from '$profileData';
import { getTokenPrices, type TokenPrice } from '$lib/api/defi/ekubo/requests';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { padAddress } from '$lib/utils';
import { fetchTokenBalance } from '$lib/accounts/balances';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { Token } from '$lib/interfaces';
import accountState from '$lib/account.svelte';
import { untrack } from 'svelte';

const BASE_TOKEN = data.mainCurrencyAddress;
export const baseToken = data.availableTokens.find(
  (token) => token.address === BASE_TOKEN,
)!;

export class WalletStore {
  private cleanup: (() => void) | null = null;
  private subscription: Subscription | null = $state(null);
  public errorMessage = $state<string | null>(null);
  private balances: SvelteMap<string, CurrencyAmount> = $state(new SvelteMap());
  private tokenPrices: TokenPrice[] = $state([]);
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

  constructor() {}

  public async init() {
    if (this.cleanup != null) {
      return;
    }

    $effect(() => {
      // Trigger update when address changes
      if (accountState.address) {
        untrack(() => this.update(accountState.address!));
      }
    });
  }

  public async update(address: string) {
    console.log('Updating wallet balance', new Error().stack);
    this.errorMessage = null;

    // Cancel existing subscription
    if (this.subscription) {
      this.subscription.cancel();
      this.subscription = null;
    }

    try {
      const { client: sdk } = useDojo();

      const request = {
        contractAddresses: data.availableTokens.map((token) => token.address),
        accountAddresses: address ? [address] : [],
        tokenIds: [],
      };

      const [tokenBalances, subscription] = await sdk.subscribeTokenBalance({
        contractAddresses: request.contractAddresses ?? [],
        accountAddresses: request.accountAddresses ?? [],
        tokenIds: request.tokenIds ?? [],
        callback: ({ data, error }) => {
          if (data) {
            this.updateTokenBalance(data);
            this.calculateTotalBalance();
          }
          if (error) {
            console.error('Error while getting balances amount:', error);
            this.errorMessage = 'Failed to update balances. Please try again.';
          }
        },
      });

      this.subscription = subscription;

      this.tokenPrices = await getTokenPrices();

      for (const item of tokenBalances.items) {
        this.updateTokenBalance(item);
      }

      // If there is no balances from torii, then we need to fetch them from RPC
      if (this.balances.size == 0 || tokenBalances.items.length == 0) {
        await this.getRPCBalances();
      }

      await this.calculateTotalBalance();
    } catch (err) {
      console.error(
        'Error while fetching balances:',
        err,
        '. Falling back to RPC',
      );

      await this.getRPCBalances();
    }
  }

  private async getRPCBalances() {
    const { client: sdk, accountManager } = useDojo();
    const account = accountManager?.getProvider()?.getWalletAccount();

    if (!account) {
      return;
    }

    const provider = sdk.provider;

    const tokenBalances = data.availableTokens.map(async (token) => {
      const balance = await fetchTokenBalance(token.address, account, provider);

      console.log(`Balance for ${token.symbol}: ${balance?.toString()}`);

      return {
        token,
        balance,
        icon: token.images.icon,
      };
    });

    const resolvedTokenBalances = await Promise.all(tokenBalances);

    for (const balance of resolvedTokenBalances) {
      if (!balance.token) continue;
      const token = balance.token!;
      const amount = CurrencyAmount.fromUnscaled(
        balance.balance?.toString() ?? '0',
        token,
      );
      this.balances.set(token.address, amount);
    }

    this.tokenPrices = await getTokenPrices();
    await this.calculateTotalBalance();
  }

  public getBalance(tokenAddress: string): CurrencyAmount | null {
    const token = data.availableTokens.find((t) => t.address === tokenAddress);
    if (!token) return null;

    return (
      this.balances.get(tokenAddress) ?? CurrencyAmount.fromUnscaled('0', token)
    );
  }

  public getPrice(tokenAddress: string): TokenPrice | null {
    const token = data.availableTokens.find((t) => t.address === tokenAddress);
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
      .dividedBy(fromPrice.ratio.rawValue() ?? 0);
    const convertedValue = baseValue.multipliedBy(
      toPrice.ratio.rawValue() ?? 0,
    );

    return CurrencyAmount.fromScaled(convertedValue.toString(), toToken);
  }

  public get allowedTokens(): Token[] {
    return data.availableTokens.filter((token) => {
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
            balance.rawValue().dividedBy(priceInfo.ratio.rawValue() ?? 0),
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

  private getToken(tokenAddress: string): Token | null {
    return data.availableTokens.find((t) => t.address === tokenAddress) ?? null;
  }

  private updateTokenBalance(item: TokenBalance) {
    const token = this.getToken(item.contract_address);
    if (!token) {
      return null;
    }
    // Convert the balance to a BigInt
    const balance = BigInt(item.balance);

    this.balances.set(
      token.address,
      CurrencyAmount.fromUnscaled(balance, token),
    );
  }

  public destroy() {
    if (this.subscription) {
      this.subscription.cancel();
      this.subscription = null;
    }
    this.cleanup?.();
  }
}

export const walletStore = new WalletStore();
