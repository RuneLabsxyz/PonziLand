import type { Token } from '$lib/interfaces';
import { padAddress } from '$lib/utils';
import data from '$profileData';
import type { SDK } from '@dojoengine/sdk';
// TODO(Red): Once they fix the types, we can import them from the sdk again...
type TokenBalance = Awaited<
  ReturnType<SDK<any>['subscribeTokenBalance']>
>[0]['items'][0];

export let tokenStore = $state<{
  balances: { token: Token; balance: bigint; icon: string }[];
  prices: { symbol: string; address: string; ratio: number | null }[];
}>({ balances: [], prices: [] });

const BASE_TOKEN = data.mainCurrencyAddress;
export const baseToken = data.availableTokens.find(
  (token) => token.address === BASE_TOKEN,
);

export const setTokenBalances = (items: TokenBalance[]) => {
  console.log('setTokenBalances', items);
  const itemBalances = items.map((item) => {
    const token = data.availableTokens.find(
      (token) =>
        padAddress(token.address) === padAddress(item.contract_address),
    );
    if (!token) {
      return null;
    }
    // Convert the balance to a BigInt
    const balance = BigInt(item.balance);

    return {
      token,
      balance,
      icon: token.images.icon,
    };
  });

  const cleanedTokenBalances = itemBalances.filter((item) => item !== null);

  tokenStore.balances = cleanedTokenBalances;
};

export const updateTokenBalance = (item: TokenBalance) => {
  const token = data.availableTokens.find(
    (token) => token.address === padAddress(item.contract_address),
  );
  if (!token) {
    return null;
  }
  // Convert the balance to a BigInt
  const balance = BigInt(item.balance);

  const tokenBalance = {
    token,
    balance,
    icon: token.images.icon,
  };

  const index = tokenStore.balances.findIndex(
    (tb) => tb.token.address === tokenBalance.token.address,
  );

  if (index !== -1) {
    tokenStore.balances[index] = tokenBalance;
  } else {
    tokenStore.balances.push(tokenBalance);
  }
};
