<script lang="ts" context="module">
  import type { BaseLand } from '$lib/api/land';
  import type { LandWithActions } from '$lib/api/land.svelte';
  import BuyLandWidget from '$lib/components/buy/buy-land-widget.svelte';
  import LandHud from '$lib/components/land/hud/land-hud.svelte';
  import LandInfoWidget from '$lib/components/land/land-info-widget.svelte';
  import InfoModal from '$lib/components/ui/info-modal.svelte';
  import WidgetLauncher from '$lib/components/widgets/widget-launcher.svelte';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import Draggable from './draggable.svelte';
  import WidgetBalance from './widgets/widget-balance.svelte';

  // Function to open buy land widget
  export function openBuyLandWidget(land: BaseLand) {
    widgetsStore.addWidget({
      id: `buy-land-${land.location.x}-${land.location.y}`,
      type: 'buy-land',
      position: { x: 300, y: 100 },
      dimensions: { width: 200, height: 50 },
      isMinimized: false,
      isOpen: true,
      data: { location: land.location },
    });
  }

  // Function to open land info widget
  export function openLandInfoWidget(land: LandWithActions) {
    console.log('openLandInfoWidget', land);

    widgetsStore.addWidget({
      id: `land-info-${land.location}`,
      type: 'land-info',
      position: { x: 300, y: 100 },
      dimensions: { width: 800, height: 600 },
      isMinimized: false,
      isOpen: true,
      data: { location: land.location },
    });
  }
</script>

<div
  class="z-50 absolute top-0 left-0 right-0 bottom-0"
  style="pointer-events: none;"
>
  <WidgetLauncher />

  {#each Object.entries($widgetsStore) as [id, widget]}
    {#if widget.isOpen}
      <Draggable {id} type={widget.type} initialPosition={widget.position} initialDimensions={widget.dimensions}>
        {@const type = widget.type}
        {#if type === 'wallet'}
          <WidgetBalance />
        {:else if type === 'land-hud'}
          <LandHud />
        {:else if type === 'buy-land' && widget.data?.land}
          <BuyLandWidget land={widget.data.land} />
        {:else if type === 'land-info' && widget.data}
          <LandInfoWidget data={widget.data} />
        {/if}
      </Draggable>
    {/if}
  {/each}

  <InfoModal isDisplay={uiStore.modalInfo} />
</div>
