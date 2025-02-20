import { PUBLIC_AVNU_URL } from '$env/static/public';
import {
  executeSwap,
  fetchQuotes,
  type ExecuteSwapOptions,
  type Quote,
} from '@avnu/avnu-sdk';
import type { CurrencyAmount } from './CurrencyAmount';
import type { Token } from '$lib/interfaces';
import { useAccount } from '$lib/contexts/account.svelte';

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

export function useAvnu() {
  // Setup avnu client
  const options = { baseUrl: PUBLIC_AVNU_URL };
  const account = useAccount();
  return {
    fetchQuotes(params: QuoteParams) {
      if (params.sellAmount) {
        return fetchQuotes(
          {
            sellTokenAddress: params.sellToken.address,
            buyTokenAddress: params.buyToken.address,
            sellAmount: params.sellAmount.toBigint(),
          },
          options,
        );
      } else {
        return fetchQuotes(
          {
            sellTokenAddress: params.sellToken.address,
            buyTokenAddress: params.buyToken.address,
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
  };
}
