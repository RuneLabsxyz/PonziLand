<script lang="ts">
  import { notificationQueue } from '$lib/stores/event.store.svelte';
  import Card from './card/card.svelte';

  let notifications = $derived(notificationQueue.getQueue());
</script>

<div class="fixed bottom-0 left-0 z-[9999] shadow-md">
  {#each notifications as notification}
    <Card>
      {#if notification.pending == true}
        <div class="flex items-center gap-2">
          <div
            class="w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"
          ></div>
          <span>Pending</span>
        </div>
      {:else if notification.isValid}
        <div class="flex items-center gap-2">
          <span class="text-green-500">✓</span>
          <span class="text-sm font-mono truncate">
            {notification.txhash?.slice(0, 10)}...{notification.txhash?.slice(
              -8,
            )}
          </span>
        </div>
      {:else}
        <div class="flex items-center gap-2">
          <span class="text-red-500">✕</span>
          <span>Error: Transaction reverted</span>
        </div>
      {/if}
    </Card>
  {/each}
</div>
