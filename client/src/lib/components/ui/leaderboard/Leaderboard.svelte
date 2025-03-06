<script lang="ts">
  import accountData from '$lib/account.svelte';
  import { fetchTokenBalance } from '$lib/accounts/balances';
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import { useDojo } from '$lib/contexts/dojo';
  import data from '$lib/data.json';
  import { dojoConfig } from '$lib/dojoConfig';
  import { DojoProvider } from '@dojoengine/core';
  import { ScrollArea } from '../../ui/scroll-area';
  import TokenDisplay from '../../ui/token-display/token-display.svelte';
  import type { Token } from '$lib/interfaces';
  import { fetchTokenBalances } from './request';
  import { onMount } from 'svelte';

  const { store, client: sdk, accountManager } = useDojo();

  let tokenBalances = $state<
    { token: Token; balance: Promise<bigint | null>; icon: string }[]
  >([]);

  const address = $derived(accountData.address);
  let leaderboardData = $state<any>([]);

  function fetchBalanceData() {
    if (accountManager == null) {
      return;
    }
    const account = accountManager.getProvider()?.getWalletAccount();

    if (!account || !address) {
      return;
    }
    const provider = new DojoProvider(dojoConfig.manifest, dojoConfig.rpcUrl);
    tokenBalances = data.availableTokens.map((token) => {
      const balance = fetchTokenBalance(token.address, account, provider);

      return {
        token,
        balance,
        icon: token.images.icon,
      };
    });
  }

  onMount(async () => {
    console.log('fetching balance data');
    fetchBalanceData();
    leaderboardData = await fetchTokenBalances();
    console.log('leaderboardData', leaderboardData);
  });
</script>

<div class="flex justify-between items-center mr-3 mb-2">
  <div class="text-2xl text-shadow-none">BALANCE</div>
  <button onclick={fetchBalanceData} aria-label="Refresh balance">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="32px"
      height="32px"
      fill="currentColor"
      class="h-5 w-5"
      ><path
        d="M 6 4 L 6 6 L 4 6 L 4 8 L 2 8 L 2 10 L 6 10 L 6 26 L 17 26 L 17 24 L 8 24 L 8 10 L 12 10 L 12 8 L 10 8 L 10 6 L 8 6 L 8 4 L 6 4 z M 15 6 L 15 8 L 24 8 L 24 22 L 20 22 L 20 24 L 22 24 L 22 26 L 24 26 L 24 28 L 26 28 L 26 26 L 28 26 L 28 24 L 30 24 L 30 22 L 26 22 L 26 6 L 15 6 z"
      /></svg
    >
  </button>
</div>

<ScrollArea class="h-36 w-full">
  <div class="mr-3 flex flex-col gap-1">
    {#each tokenBalances as tokenBalance}
      {#await tokenBalance.balance}
        <div class="flex justify-between items-center">
          <div class="flex flex-col items-end">
            <div>loading...</div>
            <span class="text-gray-500">loading</span>
          </div>
        </div>
      {:then balance}
        <div class="flex justify-between items-center relative">
          <Avatar.Root class="h-6 w-6">
            <Avatar.Image
              src={tokenBalance.token.images.icon}
              alt={tokenBalance.token.symbol}
            />
            <Avatar.Fallback>{tokenBalance.token.symbol}</Avatar.Fallback>
          </Avatar.Root>
          <TokenDisplay amount={balance ?? 0n} token={tokenBalance.token} />
        </div>
      {/await}
    {/each}
  </div>
</ScrollArea>
