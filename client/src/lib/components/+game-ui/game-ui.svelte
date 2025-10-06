<script lang="ts" context="module">
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import WidgetLauncher from '$lib/components/+game-ui/widgets/widget-launcher.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { hexStringToNumber, locationIntToString } from '$lib/utils';
  import TxNotificationZone from '../ui/tx-notification-zone.svelte';
  import OverlayManager from './overlay-manager/OverlayManager.svelte';
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
      id: `land-info ${locationIntToString(land.location)} #${hexStringToNumber(land.location)}`,
      type: 'land-info',
      position: { x: 100, y: 100 },
      dimensions: { width: 800, height: 0 },
      isMinimized: false,
      isOpen: true,
      data: { location: land.location },
      disableResize: true,
    });
  }
</script>

<div
  class="z-40 absolute top-0 left-0 right-0 bottom-0"
  style="pointer-events: none;"
>
  <OverlayManager />

  <WidgetLauncher />
  <WidgetProvider />

  <TxNotificationZone />
</div>
