<script lang="ts">
  import { fetchTokenBalance } from '$lib/accounts/balances';
  import { useDojo } from '$lib/contexts/dojo';
  import { dojoConfig } from '$lib/dojoConfig';
  import { DojoProvider } from '@dojoengine/core';
  import data from '$lib/data.json';

  const { store, client: sdk, account } = useDojo();

  const accountData = $derived(account.getAccount());

  let tokenBalances = $state<
    { token: string; balance: Promise<bigint | null> }[]
  >([]);

  const toReadableFormat = (
    balance: unknown,
    precision: number = 4,
    tokenDecimals: number = 18,
  ) => {
    if (typeof balance !== 'bigint' && typeof balance !== 'number') {
      return balance;
    }

    const factor = BigInt(10) ** BigInt(tokenDecimals - precision);
    const adjustedBalance = BigInt(balance) / factor;
    const formattedBalance = Number(adjustedBalance) / 10 ** precision;

    return formattedBalance.toPrecision(precision);
  };

  $effect(() => {
    if (!accountData) {
      return;
    }

    const provider = new DojoProvider(dojoConfig.manifest, dojoConfig.rpcUrl);
    tokenBalances = data.availableTokens.map((token) => {
      const balance = fetchTokenBalance(token.address, accountData, provider);

      return {
        token: token.name,
        balance,
      };
    });
  });
</script>

<div>Wallet Balance</div>
{#each tokenBalances as tokenBalance}
  <div>
    <span>{tokenBalance.token}:</span>
    {#await tokenBalance.balance}
      <div>Loading...</div>
    {:then balance}
      {toReadableFormat(balance)}
      <span class="text-gray-500">({balance})</span>
    {/await}
  </div>
{/each}
