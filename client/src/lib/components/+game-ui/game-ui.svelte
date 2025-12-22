<script lang="ts" context="module">
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import WidgetLauncher from '$lib/components/+game-ui/widgets/widget-launcher.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { locationToCoordinates } from '$lib/utils';
  import { devsettings } from '../+game-map/three/utils/devsettings.store.svelte';
  import GameToastZone from '../ui/game-toast/game-toast-zone.svelte';
  import TxNotificationZone from '../ui/tx-notification-zone.svelte';
  import OverlayManager from './overlay-manager/OverlayManager.svelte';
  import WidgetProvider from './widgets/widget-provider.svelte';

  // Function to open land info widget
  export function openLandInfoWidget(land: LandWithActions) {
    const { x, y } = locationToCoordinates(land.location);
    widgetsStore.addWidget({
      id: devsettings.multiLandInfo ? `land-info [${x}-${y}]` : 'land-info',
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
  <GameToastZone />
</div>
