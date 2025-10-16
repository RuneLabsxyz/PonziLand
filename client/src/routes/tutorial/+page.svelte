<script lang="ts">
  import WebGLError from '$lib/components/loading-screen/webgl-error.svelte';
  import { onMount } from 'svelte';
  import { initializeWebGL, webGLStateStore } from '$lib/utils/webgl.svelte';
  import LoadingScreen from '$lib/components/loading-screen/loading-screen.svelte';
  import TutorialUi from '$lib/components/+tutorial-ui/tutorial-ui.svelte';
  import TutorialCanva from '$lib/components/+tutorial-map/tutorial-canva.svelte';
  import { tutorialLoadingStore } from '$lib/stores/tutorial-loading.store.svelte';

  let webglShow = $derived(webGLStateStore.hasError);
  let webglError = $derived(webGLStateStore.errorMessage);
  let loading = $derived(tutorialLoadingStore.isLoading);
  let gameContentReady = $derived(!loading);

  onMount(async () => {
    initializeWebGL();
    await tutorialLoadingStore.startLoading();
  });
</script>

<WebGLError isVisible={webglShow} errorMessage={webglError} />

<div class="h-screen w-screen bg-black/10 overflow-visible relative">
  {#if !webglShow && gameContentReady}
    <div class="absolute inset-0">
      <TutorialUi />
      <TutorialCanva />
    </div>
  {/if}

  {#if loading && !webglShow}
    <div class="absolute inset-0 z-[1000]">
      <LoadingScreen value={tutorialLoadingStore.progress} />
    </div>
  {/if}
</div>
