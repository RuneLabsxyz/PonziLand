<script lang="ts">
  import WebGLError from '$lib/components/loading-screen/webgl-error.svelte';
  import { onMount } from 'svelte';
  import { initializeWebGL, webGLStateStore } from '$lib/utils/webgl.svelte';
  import LoadingScreen from '$lib/components/loading-screen/loading-screen.svelte';
  import GameUi from '$lib/components/+game-ui/game-ui.svelte';
  import GameCanva from '$lib/components/+game-map/game-canva.svelte';
  import SwitchChainModal from '$lib/components/+game-ui/modals/SwitchChainModal.svelte';
  import WelcomeModal from '$lib/components/+game-ui/modals/WelcomeModal.svelte';
  import { loadingStore } from '$lib/stores/loading.store.svelte';
  import { welcomeModalStore } from '$lib/stores/welcome-modal.store.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { gameStore } from '$lib/components/+game-map/three/game.store.svelte';
  import { parseLocation } from '$lib/utils';
  import { page } from '$app/state';
  import accountState from '$lib/account.svelte';
  import type { PageData } from './$types';

  let webglShow = $derived(webGLStateStore.hasError);
  let webglError = $derived(webGLStateStore.errorMessage);
  let loading = $derived(loadingStore.isLoading);

  // Check if Dojo is ready before showing game content
  let gameContentReady = $derived(
    !loading && loadingStore.phases.dojo.items['dojo-init'],
  );

  // Land lookup from URL query param (?land=<location>)
  const landParam = $derived(page.url.searchParams.get('land'));
  let landLookupHandled = $state(false);

  $effect(() => {
    if (
      !landParam ||
      landLookupHandled ||
      !gameContentReady ||
      !gameStore.cameraControls
    )
      return;

    const location = Number(landParam);
    if (isNaN(location)) return;

    const [x, y] = parseLocation(location);
    landLookupHandled = true;

    // Center camera on the land
    gameStore.cameraControls.setLookAt(x, 50, y, x, 0, y, false);
    gameStore.cameraControls.zoomTo(250, false);

    // Open land info widget
    const position = {
      x: Math.max(50, (window.innerWidth - 800) / 2),
      y: Math.max(50, (window.innerHeight - 800) / 2),
    };
    widgetsStore.addWidget({
      id: 'land-info',
      type: 'land-info',
      position,
      dimensions: { width: 800, height: 0 },
      isMinimized: false,
      isOpen: true,
      data: { location: String(location) },
      disableResize: true,
    });
  });

  // Check for first-time player and show welcome modal
  $effect(() => {
    console.log('[WelcomeModal] Effect triggered', {
      gameContentReady,
      isConnected: accountState.isConnected,
      address: accountState.address,
      isChecking: welcomeModalStore.isChecking,
    });

    if (
      gameContentReady &&
      accountState.isConnected &&
      accountState.address &&
      !welcomeModalStore.isChecking
    ) {
      console.log(
        '[WelcomeModal] Calling checkAndShowModal with address:',
        accountState.address,
      );
      welcomeModalStore.checkAndShowModal(accountState.address);
    }
  });

  onMount(async () => {
    // Initialize WebGL first
    initializeWebGL();

    // Start comprehensive loading
    await loadingStore.startComprehensiveLoading(false);
  });
</script>

<!-- WebGL Error Modal -->
<WebGLError isVisible={webglShow} errorMessage={webglError} />

<div class="h-screen w-screen bg-black/10 overflow-visible relative">
  <!-- Game Canvas and UI - Always rendered but potentially hidden -->
  {#if !webglShow && gameContentReady}
    <div class="absolute inset-0">
      <SwitchChainModal />
      <WelcomeModal />
      <GameUi />
      <GameCanva />
    </div>
  {/if}

  <!-- Loading Screen (overlay on top) -->
  {#if loading && !webglShow}
    <div class="absolute inset-0 z-[1000]">
      <LoadingScreen value={0} />
    </div>
  {/if}
</div>
