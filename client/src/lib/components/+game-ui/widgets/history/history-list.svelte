<script lang="ts">
  import { accountHistory } from '$lib/api/history/index.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import HistoryEntry from './history-entry.svelte';

  // Reactive state from the history store
  const events = $derived(accountHistory.events);
  const loading = $derived(accountHistory.loading);
  const error = $derived(accountHistory.error);
  const hasMore = $derived(accountHistory.hasMore);
  const isEmpty = $derived(accountHistory.isEmpty);

  function handleLoadMore() {
    accountHistory.loadMore();
  }
</script>

<ScrollArea type="scroll" class="flex-1">
  <div class="flex flex-col">
    {#if loading && isEmpty}
      <div class="text-center py-8 text-gray-400">Loading history...</div>
    {:else if error}
      <div class="text-center py-8 text-red-400">
        Error: {error}
      </div>
    {:else if isEmpty}
      <div class="text-center py-8 text-gray-400">No events yet</div>
    {:else}
      {#each events as event (event.id)}
        <HistoryEntry {event} />
      {/each}

      {#if hasMore}
        <div class="text-center py-4">
          <button
            onclick={handleLoadMore}
            disabled={loading}
            class="load-more-button px-4 py-2 text-white text-sm rounded transition-colors"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</ScrollArea>

<style>
  .load-more-button {
    background-color: rgba(75, 85, 99, 0.8);
  }

  .load-more-button:hover:not(:disabled) {
    background-color: rgba(75, 85, 99, 1);
  }

  .load-more-button:disabled {
    background-color: rgba(55, 65, 81, 0.5);
    color: rgb(156, 163, 175);
    cursor: not-allowed;
  }
</style>
