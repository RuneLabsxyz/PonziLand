<script lang="ts" context="module">
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import WidgetLauncher from '$lib/components/+game-ui/widgets/widget-launcher.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { locationToCoordinates } from '$lib/utils';
  import { devsettings } from '../+game-map/three/utils/devsettings.store.svelte';
  import TxNotificationZone from '../ui/tx-notification-zone.svelte';
  import OverlayManager from './overlay-manager/OverlayManager.svelte';
  import WidgetProvider from './widgets/widget-provider.svelte';
  import MobileBottomNavbar from '../ui/mobile-bottom-navbar.svelte';
  import MobileContentContainer from '../ui/mobile-content-container.svelte';
  import { deviceStore } from '$lib/stores/device.store.svelte';
  import { openMobileLandDetails } from '$lib/stores/mobile-nav.store';

  // Function to open land info widget
  export function openLandInfoWidget(land: LandWithActions) {
    // Check if mobile and redirect to mobile land tab
    if (deviceStore.isMobile) {
      openMobileLandDetails(land);
      return;
    }

    // Desktop behavior - open widget
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

  <!-- Desktop widget launcher and provider -->
  <div class="hidden md:block">
    <WidgetLauncher />
    <WidgetProvider />
  </div>

  <TxNotificationZone />

  <!-- Mobile navigation and content -->
  <div class="md:hidden">
    <MobileBottomNavbar />
    <MobileContentContainer />
  </div>
</div>
