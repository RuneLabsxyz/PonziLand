<script lang="ts" context="module">
  import type { BaseLand } from '$lib/api/land';
  import type { LandWithActions } from '$lib/api/land.svelte';
  import WidgetLauncher from '$lib/components/+game-ui/widgets/widget-launcher.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import TxNotificationZone from '../ui/tx-notification-zone.svelte';
  import WidgetProvider from './widgets/widget-provider.svelte';

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
    widgetsStore.addWidget({
      id: `land-info-${land.location}`,
      type: 'land-info',
      position: { x: 100, y: 100 },
      dimensions: { width: 800, height: 600 },
      isMinimized: false,
      isOpen: true,
      data: { location: land.location },
    });
  }
</script>

<div
  class="z-40 absolute top-0 left-0 right-0 bottom-0"
  style="pointer-events: none;"
>
  <WidgetLauncher />
  <WidgetProvider />

  <TxNotificationZone />
</div>
