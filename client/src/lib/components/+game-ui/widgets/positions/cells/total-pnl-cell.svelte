<script lang="ts">
  import { locationToCoordinates } from '$lib/utils';
  import type { HistoricalPosition } from '../historical-positions.service';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { Share } from 'lucide-svelte';
  import { formatPercentage } from '$lib/utils/format';

  interface Props {
    position: HistoricalPosition;
    showShareButton?: boolean;
    showPercentage?: boolean;
  }

  let {
    position,
    showShareButton = true,
    showPercentage = false,
  }: Props = $props();

  // Use pre-calculated metrics
  const realizedPnL = $derived(position.metrics?.totalPnL ?? null);
  const isOpen = $derived(position.metrics?.isOpen ?? false);
  const roi = $derived(position.metrics?.roi ?? null);

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
  class="text-right flex items-center justify-end gap-1 text-sm tracking-widest whitespace-nowrap"
>
  {#if realizedPnL}
    <div class="flex flex-col items-end">
      <span
        class={[
          'leading-none font-ponzi-number',
          realizedPnL.rawValue().isPositive()
            ? 'text-green-400'
            : 'text-red-400',
        ]}
      >
        {realizedPnL.rawValue().isPositive() ? '+' : '-'}${realizedPnL
          .rawValue()
          .abs()
          .toNumber()
          .toFixed(2)}
      </span>
      {#if showPercentage && roi !== null}
        <span
          class={[
            'text-lg font-normal tracking-wider leading-none',
            roi > 0 ? 'text-green-400' : 'text-red-400',
          ]}
        >
          {formatPercentage(roi)}
        </span>
      {/if}
    </div>
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
        <Share class="w-3 h-3" />
      </div>
    {/if}
  {:else}
    <span class="text-gray-500">{isOpen ? 'TBD' : '-'}</span>
  {/if}
</div>
