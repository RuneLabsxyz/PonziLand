import type { Token } from '$lib/interfaces';
import { padAddress } from '$lib/utils';
import type { TokenBalance } from '@dojoengine/torii-client';
import data from '$lib/data.json';

export let tokenStore = $state<{
  balances: { token: Token; balance: bigint; icon: string }[];
  prices: { symbol: string; address: string; ratio: number | null }[];
}>({ balances: [], prices: [] });

export const setTokenBalances = (items: TokenBalance[]) => {
  const itemBalances = items.map((item) => {
    const token = data.availableTokens.find(
      (token) => token.address === padAddress(item.contract_address),
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
