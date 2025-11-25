<script lang="ts">
  import { accountHistory } from '$lib/api/history/index.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import { onMount, onDestroy } from 'svelte';
  import HistoryList from './history-list.svelte';
  import { Button } from '$lib/components/ui/button';
  import account from '$lib/account.svelte';

  const { accountManager: dojoAccountManager } = useDojo();

  let refreshInterval: NodeJS.Timeout;

  onMount(async () => {
    try {
      const userAddress = padAddress(account?.address ?? ' ');
      accountHistory.setAccount(userAddress ?? ' ');

      // Set up auto-refresh every 30 seconds
      refreshInterval = setInterval(() => {
        accountHistory.fetchNewEvents();
      }, 30000);
    } catch (error) {
      console.error('Error setting up history widget:', error);
    }
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
</script>

<div class="h-full w-full flex flex-col">
  {#if !account.isConnected}
    <!-- Wallet connection prompt -->
    <div class="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div class="text-center tracking-wide">
        <p class="opacity-75 text-xl">
          To see your transaction history please connect your wallet.
        </p>
      </div>
      <Button
        class=""
        onclick={async () => {
          await dojoAccountManager?.promptForLogin();
        }}
      >
        CONNECT WALLET
      </Button>
    </div>
  {:else}
    <!-- Events List -->
    <HistoryList />
  {/if}
</div>
