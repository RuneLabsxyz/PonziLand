<script lang="ts">
  import { locationToCoordinates } from '$lib/utils';
  import type { HistoricalPosition } from '../historical-positions.service';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { Share } from 'lucide-svelte';

  interface Props {
    position: HistoricalPosition;
    showShareButton?: boolean;
  }

  let { position, showShareButton = true }: Props = $props();

  // Use pre-calculated metrics
  const realizedPnL = $derived(position.metrics?.totalPnL ?? null);
  const isOpen = $derived(position.metrics?.isOpen ?? false);

  function openShareWidget(positionData: HistoricalPosition) {
    const coordinates = locationToCoordinates(positionData.land_location);

    widgetsStore.addWidget({
      id: `share-${positionData.land_location}-${Date.now()}`,
      type: 'share',
      position: {
        x: window.innerWidth / 2 - 183,
        y: window.innerHeight / 2 - 333.5,
      },
      dimensions: { width: 375, height: 0 },
      isMinimized: false,
      isOpen: true,
      data: {
        position: positionData,
        coordinates: coordinates,
      },
    });
  }
</script>

<div
  class="text-right flex items-center justify-end gap-1 font-ponzi-number text-sm tracking-widest"
>
  {#if realizedPnL}
    <span
      class={realizedPnL.rawValue().isPositive()
        ? 'text-green-400'
        : 'text-red-400'}
    >
      {realizedPnL.rawValue().isPositive() ? '+' : ''}{realizedPnL
        .rawValue()
        .toNumber()
        .toFixed(2)} $
    </span>
    {#if showShareButton}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 cursor-pointer"
        onclick={(e) => {
          e.stopPropagation();
          openShareWidget(position);
        }}
        title="Share position"
      >
        <Share class="w-4 h-4" />
      </div>
    {/if}
  {:else}
    <span class="text-gray-500">{isOpen ? 'TBD' : '-'}</span>
  {/if}
</div>
