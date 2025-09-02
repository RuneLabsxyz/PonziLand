<script lang="ts">
  import { goto } from '$app/navigation';
  import { refresh, setup as setupAccountState } from '$lib/account.svelte';
  import { setupSocialink } from '$lib/accounts/social/index.svelte';
  import GameCanva from '$lib/components/+game-map/game-canva.svelte';
  import GameUi from '$lib/components/+game-ui/game-ui.svelte';
  import SwitchChainModal from '$lib/components/+game-ui/modals/SwitchChainModal.svelte';
  import {
    fetchUsernamesBatch,
    getUserAddresses,
  } from '$lib/components/+game-ui/widgets/leaderboard/request';
  import LoadingScreen from '$lib/components/loading-screen/loading-screen.svelte';
  import {
    tutorialLandStore,
    tutorialState,
  } from '$lib/components/tutorial/stores.svelte';
  import { setupAccount } from '$lib/contexts/account.svelte';
  import { setupClient } from '$lib/contexts/client.svelte';
  import { dojoConfig } from '$lib/dojoConfig';
  import { usernamesStore } from '$lib/stores/account.store.svelte';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { landStore } from '$lib/stores/store.svelte';
  import { setupConfigStore } from '$lib/stores/config.store.svelte';
  import { onMount } from 'svelte';
  import { devsettings } from '$lib/components/+game-map/three/utils/devsettings.store.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';

  // WebGL support detection
  function isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!(gl && (gl as WebGLRenderingContext).getParameter);
    } catch (e) {
      return false;
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
    setupSocialink().then(() => {
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
        await refresh();

        // Check if the user needs to signup with socialink
        if (address != null && !accountState.profile?.exists) {
          console.info('The user needs to signup with socialink.');
      //    goto('/onboarding/register');
      //    return;
        }

        if (
          address != null &&
          accountState.profile?.exists &&
          !accountState.profile?.whitelisted
        ) {
          console.info('The user needs to get whitelisted.');
       //   goto('/onboarding/whitelist');
       //   return;
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

  async function getUsernames() {
    try {
      const addresses = usernamesStore.getAddresses().map((a) => a.address);

      if (addresses.length === 0) {
        console.warn('No addresses to lookup.');
        return;
      }

      const fetchedUsernames = await fetchUsernamesBatch(addresses);

      await usernamesStore.updateUsernames(fetchedUsernames);
    } catch (error) {
      console.error('Error refreshing usernames:', error);
    }
  }

  onMount(async () => {
    const addresses: Array<{ address: string }> = await getUserAddresses();

    const formattedAddresses = addresses.map(({ address }) => ({
      address: address,
    }));

    usernamesStore.addAddresses(formattedAddresses);

    await getUsernames();
  });
</script>

<div class="h-screen w-screen bg-black/10 overflow-visible">
  <SwitchChainModal />

  {#if !webGLSupported}
    <!-- WebGL Error Fallback -->
    <div class="h-screen w-screen bg-black flex items-center justify-center">
      <div
        class="max-w-md mx-auto text-center p-8 bg-gray-900 rounded-lg border border-gray-700"
      >
        <div class="mb-6">
          <svg
            class="w-16 h-16 mx-auto text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h2 class="text-2xl font-bold text-white mb-2">
            WebGL Not Supported
          </h2>
        </div>
        <p class="text-gray-300 mb-6">{webGLError}</p>
        <div class="space-y-4">
          <button
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            onclick={() => window.location.reload()}
          >
            Try Again
          </button>
          <div class="text-sm text-gray-400">
            <p class="mb-2">Possible solutions:</p>
            <ul class="text-left list-disc list-inside space-y-1">
              <li>Update your browser to the latest version</li>
              <li>Enable hardware acceleration in browser settings</li>
              <li>Try a different browser (Chrome, Firefox, Edge)</li>
              <li>Update your graphics drivers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  {:else if loading}
    <LoadingScreen {value} />
  {:else if canvasError}
    <!-- Canvas Runtime Error Fallback -->
    <div class="h-screen w-screen bg-black flex items-center justify-center">
      <div
        class="max-w-md mx-auto text-center p-8 bg-gray-900 rounded-lg border border-gray-700"
      >
        <div class="mb-6">
          <svg
            class="w-16 h-16 mx-auto text-orange-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 class="text-2xl font-bold text-white mb-2">Graphics Error</h2>
        </div>
        <p class="text-gray-300 mb-6">{canvasErrorMessage}</p>
        <div class="space-y-4">
          <button
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            onclick={() => window.location.reload()}
          >
            Reload Game
          </button>
          <div class="text-sm text-gray-400">
            <p class="mb-2">This may help:</p>
            <ul class="text-left list-disc list-inside space-y-1">
              <li>Close other graphics-intensive applications</li>
              <li>Try refreshing the page</li>
              <li>Restart your browser</li>
              <li>Check for browser or driver updates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <GameCanva />
    {#if devsettings.showUI}
      <GameUi />
    {/if}
  {/if}
</div>
