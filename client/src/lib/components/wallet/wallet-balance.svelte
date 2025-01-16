<script lang="ts">
  import { fetchTokenBalance } from '$lib/accounts/balances';
  import { useDojo } from '$lib/contexts/dojo';
  import { dojoConfig } from '$lib/dojoConfig';
  import { DojoProvider } from '@dojoengine/core';
  import accountData from '$lib/account.svelte';
  import data from '$lib/data.json';
  import { Button } from '../ui/button';

  const { store, client: sdk, accountManager } = useDojo();

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

    return formattedBalance.toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  };

  const address = $derived(accountData.address);

  function fetchBalanceData() {
    const account = accountManager.getProvider()?.getWalletAccount();
    console.log('UPDATINGGGGG');

    if (!account || !address) {
      return;
    }
    const provider = new DojoProvider(dojoConfig.manifest, dojoConfig.rpcUrl);
    tokenBalances = data.availableTokens.map((token) => {
      const balance = fetchTokenBalance(token.address, account, provider);

      return {
        token: token.name,
        balance,
      };
    });
  }

  $effect(() => {
    fetchBalanceData();
  });
</script>

<div>Wallet Balance</div>
<Button onclick={fetchBalanceData}>Refresh</Button>
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
