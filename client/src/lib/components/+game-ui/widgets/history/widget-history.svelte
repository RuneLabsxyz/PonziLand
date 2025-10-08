<script lang="ts">
  import { accountHistory } from '$lib/api/history/index.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import { onMount, onDestroy } from 'svelte';
  import HistoryList from './history-list.svelte';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  let refreshInterval: NodeJS.Timeout;

  onMount(async () => {
    try {
      const currentAccount = account()?.getWalletAccount();
      if (!currentAccount) {
        console.error('No wallet account available');
        return;
      }

      const userAddress = padAddress(currentAccount.address)!;
      accountHistory.setAccount(userAddress);

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

<div class="history-widget h-full w-full flex flex-col">
  <!-- Events List -->
  <HistoryList />
</div>
