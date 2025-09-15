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
  }

  let webGLSupported = $state(true);
  let webGLError = $state('');
  let canvasError = $state(false);
  let canvasErrorMessage = $state('');

  // Handle Canvas/WebGL runtime errors
  function handleCanvasError(error: Error) {
    console.error('Canvas/WebGL Error:', error);
    canvasError = true;
    canvasErrorMessage =
      error.message || 'An error occurred while initializing the 3D graphics.';
    loading = false;
  }

  const promise = Promise.all([
    FUSE_DISABLE_SOCIALINK
      ? setupAccountState()
      : setupSocialink().then(() => {
          return setupAccountState();
        }),
    setupClient().then(async (client) => {
      // Initialize both stores with Dojo client
      landStore.setup(client!);
      landStore.stopRandomUpdates();

      // Setup config subscription - this loads dynamic config from blockchain
      await setupConfigStore(client!);
    }),
    setupAccount(),
  ]);

  let loading = $state(true);

  // Check WebGL support on mount
  if (typeof window !== 'undefined') {
    if (!isWebGLSupported()) {
      webGLSupported = false;
      webGLError =
        'WebGL is not supported on this device or browser. Please try updating your browser or enabling hardware acceleration.';
      loading = false;
    }
  }

  let value = $state(10);

  $effect(() => {
    tutorialLandStore.stopRandomUpdates();
    // tutorialLandStore.startRandomUpdates();
    let increment = 10;

    const interval = setInterval(() => {
      value += increment;
      if (increment > 1) {
        increment = increment - 1;
      }
      if (value >= 80) {
        clearInterval(interval);
      }
    }, 100);

    function clearLoading() {
      clearInterval(interval);
      value = 100;
      setTimeout(() => {
        loading = false;
      }, 200);
    }

    promise
      .then(async ([accountState, dojo, accountManager]) => {
        if (accountState == null) {
          console.error('Account state is null!');

          return;
        }

        // Check if the user needs to signup with socialink
        const address = accountManager
          ?.getProvider()
          ?.getWalletAccount()?.address;

        // Make sure that we finished updating the user signup state.
        if (!FUSE_DISABLE_SOCIALINK) {
          await refresh();

          // Check if the user needs to signup with socialink
          if (address != null && !accountState.profile?.exists) {
            console.info('The user needs to signup with socialink.');
         //   goto('/onboarding/register');
         //   return;
          }

          if (
            address != null &&
            accountState.profile?.exists &&
            !accountState.profile?.whitelisted
          ) {
          //  console.info('The user needs to get whitelisted.');
          //  goto('/onboarding/whitelist');
          //  return;
          }
        }

        console.log('Everything is ready!', dojo != undefined);

        tutorialState.tutorialEnabled = false;
        widgetsStore.removeWidget('tutorial');
        clearLoading();
        gameSounds.play('launchGame');
      })
      .catch((err) => {
        console.error('An error occurred:', err);

        // Check if the error might be WebGL related
        if (err.message) {
          if (err.message.includes('WebGL')) {
            webGLSupported = false;
            webGLError = err.message;
          } else if (err.message.includes('canvas')) {
            handleCanvasError(err);
          }
        }
        loading = false;
      });
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
