import { PUBLIC_AVNU_URL } from '$env/static/public';
import {
  executeSwap,
  fetchQuotes,
  type ExecuteSwapOptions,
  type Quote,
  type QuoteRequest,
} from '@avnu/avnu-sdk';
import type { CurrencyAmount } from './CurrencyAmount';
import type { Token } from '$lib/interfaces';
import { useAccount } from '$lib/contexts/account.svelte';
import {
  configValues,
  setupConfigStore,
} from '$lib/stores/config.store.svelte';

export type BaseQuoteParams = {
  sellToken: Token;
  buyToken: Token;
};
export type SellQuote = BaseQuoteParams & {
  sellAmount: CurrencyAmount;
  buyAmount?: undefined;
};
export type BuyQuote = BaseQuoteParams & {
  sellAmount?: undefined;
  buyAmount: CurrencyAmount;
};

export type QuoteParams = SellQuote | BuyQuote;

export type SwapPriceParams = {
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: string;
};

export type SwapPriceResponse = {
  buyAmount: string;
  sellAmount: string;
  estimatedPriceImpact: string;
  routes: any[];
}[];

export function useAvnu() {
  // Setup avnu client
  const options = { baseUrl: PUBLIC_AVNU_URL };
  const account = useAccount();
  return {
    fetchQuotes(params: QuoteParams) {
      let baseParams: QuoteRequest = {
        sellTokenAddress: params.sellToken.address,
        buyTokenAddress: params.buyToken.address,
      };

      if (configValues.feeContract) {
        baseParams.integratorFeeRecipient = configValues.feeContract;
        baseParams.integratorFees = 50n; // 0.5%
      }

      if (params.sellAmount) {
        return fetchQuotes(
          {
            ...baseParams,
            sellAmount: params.sellAmount.toBigint(),
          },
          options,
        );
      } else {
        return fetchQuotes(
          {
            ...baseParams,
            buyAmount: params.buyAmount.toBigint(),
          },
          options,
        );
      }
    },
    executeSwap(quote: Quote, executeOptions: ExecuteSwapOptions = {}) {
      return executeSwap(
        account?.getProvider()?.getWalletAccount()!,
        quote,
        executeOptions,
        options,
      );
    },
    async fetchSwapPrice(params: SwapPriceParams): Promise<SwapPriceResponse> {
      try {
        const url = new URL(`${PUBLIC_AVNU_URL}/swap/v2/prices`);
        url.searchParams.append('sellTokenAddress', params.sellTokenAddress);
        url.searchParams.append('buyTokenAddress', params.buyTokenAddress);
        url.searchParams.append('sellAmount', params.sellAmount);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching swap price:', error);
        throw error;
      }
    },
  };
}
