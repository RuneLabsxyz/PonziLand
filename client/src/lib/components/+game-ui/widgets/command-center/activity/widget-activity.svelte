<script lang="ts">
  import { activityStore } from '$lib/stores/activity.store.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import ActivityEntry from './activity-entry.svelte';

  const events = $derived(activityStore.events);
  const isEmpty = $derived(activityStore.isEmpty);
</script>

<ScrollArea type="scroll" class="flex-1">
  <div class="flex flex-col">
    {#if isEmpty}
      <div class="text-center py-8 text-gray-400 text-sm">
        No activity yet. Events will appear here when players buy, sell, or get
        nuked.
      </div>
    {:else}
      {#each events as event (event.id)}
        <ActivityEntry {event} />
      {/each}
    {/if}
  </div>
</ScrollArea>
