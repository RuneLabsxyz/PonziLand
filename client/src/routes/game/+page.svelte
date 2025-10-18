<script lang="ts">
  import WebGLError from '$lib/components/loading-screen/webgl-error.svelte';
  import { onMount } from 'svelte';
  import { initializeWebGL, webGLStateStore } from '$lib/utils/webgl.svelte';
  import LoadingScreen from '$lib/components/loading-screen/loading-screen.svelte';
  import GameUi from '$lib/components/+game-ui/game-ui.svelte';
  import GameCanva from '$lib/components/+game-map/game-canva.svelte';
  import SwitchChainModal from '$lib/components/+game-ui/modals/SwitchChainModal.svelte';
  import { loadingStore } from '$lib/stores/loading.store.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let webglShow = $derived(webGLStateStore.hasError);
  let webglError = $derived(webGLStateStore.errorMessage);
  let loading = $derived(loadingStore.isLoading);

  // In non-tutorial mode, also check if Dojo is ready before showing game content
  let gameContentReady = $derived(() => {
    if (data.isTutorialMode) {
      // Tutorial mode: only need basic loading to complete
      return !loading;
    } else {
      // Full mode: need loading complete AND Dojo setup
      return !loading && loadingStore.phases.dojo.items['dojo-init'];
    }
  });

  onMount(async () => {
    // Initialize WebGL first
    initializeWebGL();

    // Get tutorial mode from page data
    const isTutorialMode = data.isTutorialMode;

    // Start comprehensive loading
    await loadingStore.startComprehensiveLoading(isTutorialMode);
  });
</script>


<!-- WebGL Error Modal -->
<WebGLError isVisible={webglShow} errorMessage={webglError} />

<div class="h-screen w-screen bg-black/10 overflow-visible relative">
  <!-- Game Canvas and UI - Always rendered but potentially hidden -->
  {#if !webglShow && gameContentReady()}
    <div class="absolute inset-0">
      <SwitchChainModal />
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
