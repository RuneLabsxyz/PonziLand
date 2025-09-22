import { useDojo } from '$lib/contexts/dojo';
import type { Subscription, TokenBalance } from '@dojoengine/torii-client';
import data from '$profileData';
import { getTokenPrices, type TokenPrice } from '$lib/api/defi/ekubo/requests';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { padAddress, getTokenMetadata } from '$lib/utils';
import { fetchTokenBalance } from '$lib/accounts/balances';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { Token } from '$lib/interfaces';
import accountState from '$lib/account.svelte';
import { untrack } from 'svelte';
import { MAX_STAKE } from '$lib/flags';
import { settingsStore } from '$lib/stores/settings.store.svelte';

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
  private conversionCache: SvelteMap<string, CurrencyAmount | null> = $state(
    new SvelteMap(),
  );
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

  // Get the currently selected base token for display calculations
  private get selectedBaseToken(): Token {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return (
      data.availableTokens.find((token) => token.address === targetAddress) ??
      this.baseToken!
    );
  }

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

    $effect(() => {
      // Recalculate total balance when selected base token changes
      settingsStore.selectedBaseTokenAddress;
      if (this.balances.size > 0) {
        untrack(() => {
          this.updateConversionCache();
          this.calculateTotalBalance();
        });
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
            this.updateConversionCache();
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

      this.updateConversionCache();
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
      const metadata = await getTokenMetadata(token.skin);

      console.log(`Balance for ${token.symbol}: ${balance?.toString()}`);

      return {
        token,
        balance,
        icon: metadata?.icon || '/tokens/default/icon.png',
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
    this.updateConversionCache();
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

    // Base token always has ratio 1
    if (padAddress(tokenAddress) === padAddress(this.BASE_TOKEN)) {
      return {
        symbol: token.symbol,
        address: token.address,
        ratio: CurrencyAmount.fromScaled(1, token),
      };
    }

    return (
      this.tokenPrices.find((p) => {
        return padAddress(p.address) === padAddress(token.address);
      }) ?? null
    );
  }

  /**
   * Update the conversion cache for all tokens to the currently selected base token
   */
  private updateConversionCache() {
    const displayBaseToken = this.selectedBaseToken;
    if (!displayBaseToken) return;

    this.conversionCache.clear();

    for (const [tokenAddress, balance] of this.balances) {
      const token = this.getToken(tokenAddress);
      if (!token) continue;

      if (padAddress(token.address) === padAddress(displayBaseToken.address)) {
        // Same token, no conversion needed
        this.conversionCache.set(tokenAddress, balance);
      } else {
        // Convert to base token equivalent
        const convertedAmount = this.convertTokenAmount(
          balance,
          token,
          displayBaseToken,
        );
        this.conversionCache.set(tokenAddress, convertedAmount);
      }
    }
  }

  /**
   * Get the cached converted amount for a token to the currently selected base token
   */
  public getCachedBaseTokenEquivalent(
    tokenAddress: string,
  ): CurrencyAmount | null {
    return this.conversionCache.get(tokenAddress) ?? null;
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

    if (!fromPrice || !toPrice) return null;

    // Convert fromAmount to base currency, then to target token
    // fromAmount * (1/fromPrice.ratio) * toPrice.ratio
    const baseValue = fromAmount
      .rawValue()
      .dividedBy(fromPrice.ratio.rawValue());

    if (baseValue.isNaN() || !baseValue.isFinite()) return null;

    const convertedValue = baseValue.multipliedBy(toPrice.ratio.rawValue());

    return CurrencyAmount.fromRaw(convertedValue, toToken);
  }

  public get allowedTokens(): Token[] {
    return data.availableTokens.filter((token) => {
      return this.balances.get(token.address) !== null;
    });
  }

  private async calculateTotalBalance() {
    if (!this.balances.size) return;

    const displayBaseToken = this.selectedBaseToken;
    let totalValue = CurrencyAmount.fromScaled(0, displayBaseToken);

    for (const [tokenAddress, balance] of this.balances) {
      if (balance === null) continue;

      const token = this.getToken(tokenAddress)!;

      const convertedAmount = this.convertTokenAmount(
        balance,
        token,
        this.baseToken!,
      );
      if (convertedAmount) {
        totalValue = totalValue.add(convertedAmount);
      }
    }

    this.totalBalance = totalValue;
  }

  public getToken(tokenAddress: string): Token | null {
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
    // @ts-expect-error  - This is a const, but I want the comportment to change if the value is changed.
    if (MAX_STAKE === 0n) {
      return true;
    }

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
    if (this.subscription) {
      this.subscription.cancel();
      this.subscription = null;
    }
    this.cleanup?.();
  }
}

export const walletStore = new WalletStore();
