<script lang="ts">
  import WebGLError from '$lib/components/loading-screen/webgl-error.svelte';
  import { onMount } from 'svelte';
  import { initializeWebGL, webGLStateStore } from '$lib/utils/webgl.svelte';
  import LoadingScreen from '$lib/components/loading-screen/loading-screen.svelte';
  import GameUi from '$lib/components/+game-ui/game-ui.svelte';
  import GameCanva from '$lib/components/+game-map/game-canva.svelte';
  import { loadingStore } from '$lib/stores/loading.store.svelte';
  import { enableTutorial } from '$lib/components/tutorial/stores.svelte';
  import TutorialDialog from '$lib/components/tutorial/tutorial-dialog.svelte';

  let webglShow = $derived(webGLStateStore.hasError);
  let webglError = $derived(webGLStateStore.errorMessage);
  let loading = $derived(loadingStore.isLoading);

  // Tutorial mode: only need basic loading to complete
  let gameContentReady = $derived(!loading);

  onMount(async () => {
    // Enable tutorial mode
    enableTutorial();

    // Initialize WebGL first
    initializeWebGL();

    // Start comprehensive loading in tutorial mode
    await loadingStore.startComprehensiveLoading(true);
  });
</script>

<!-- WebGL Error Modal -->
<WebGLError isVisible={webglShow} errorMessage={webglError} />

<div class="h-screen w-screen bg-black/10 overflow-visible relative">
  <!-- Game Canvas and UI - Always rendered but potentially hidden -->
  {#if !webglShow && gameContentReady}
    <div class="absolute inset-0">
      <GameUi />
      <GameCanva />
      <TutorialDialog />
    </div>
  {/if}

  <!-- Loading Screen (overlay on top) -->
  {#if loading && !webglShow}
    <div class="absolute inset-0 z-[1000]">
      <LoadingScreen value={0} />
    </div>
  {/if}
</div>
