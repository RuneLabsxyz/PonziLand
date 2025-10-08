<script lang="ts">
  import type { HistoryEvent } from '$lib/api/history/index.svelte';
  import LandBoughtEntry from './land-bought-entry.svelte';
  import LandNukedEntry from './land-nuked-entry.svelte';

  interface Props {
    event: HistoryEvent;
  }

  let { event }: Props = $props();
</script>

{#if event.type === 'LandBoughtEvent'}
  <LandBoughtEntry {event} />
{:else if event.type === 'LandNukedEvent'}
  <LandNukedEntry {event} />
{:else}
  <!-- Fallback for unknown event types -->
  <div class="event-item flex flex-col py-3 px-4 border-b border-gray-800/50">
    <div class="text-xs text-gray-500 mb-1">Unknown Event</div>
    <div class="text-sm text-gray-400">
      Unknown event type: {(event as any).type}
    </div>
  </div>
{/if}

<style>
  .event-item {
    transition: background-color 0.2s;
  }

  .event-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
</style>
