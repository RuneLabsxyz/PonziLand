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
  import accountState from '$lib/account.svelte';
  import type { PageData } from './$types';
  import { sidebarWidth } from '$lib/stores/widgets.store';

  let webglShow = $derived(webGLStateStore.hasError);
  let webglError = $derived(webGLStateStore.errorMessage);
  let loading = $derived(loadingStore.isLoading);

  // Check if Dojo is ready before showing game content
  let gameContentReady = $derived(
    !loading && loadingStore.phases.dojo.items['dojo-init'],
  );

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
    <div
      class="absolute inset-0 transition-[right] duration-250 ease-in-out"
      style="right: {$sidebarWidth}px;"
    >
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
