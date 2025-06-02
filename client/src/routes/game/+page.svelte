<script lang="ts">
  import { goto } from '$app/navigation';
  import { refresh, setup as setupAccountState } from '$lib/account.svelte';
  import { setupSocialink } from '$lib/accounts/social/index.svelte';
  import GameGrid from '$lib/components/+game-map/game-grid.svelte';
  import GameUi from '$lib/components/+game-ui/game-ui.svelte';
  import SwitchChainModal from '$lib/components/+game-ui/modals/SwitchChainModal.svelte';
  import LoadingScreen from '$lib/components/loading-screen/loading-screen.svelte';
  import {
    tutorialEnabled,
    tutorialLandStore,
  } from '$lib/components/tutorial/stores.svelte';
  import { setupAccount } from '$lib/contexts/account.svelte';
  import { setupClient } from '$lib/contexts/client.svelte';
  import { dojoConfig } from '$lib/dojoConfig';
  import { launchGame_sound } from '$lib/sfx';
  import { landStore } from '$lib/stores/store.svelte';

  const promise = Promise.all([
    setupSocialink().then(() => {
      return setupAccountState();
    }),
    setupClient(dojoConfig).then((client) => {
      landStore.setup(client!);
      landStore.stopRandomUpdates();
    }),
    setupAccount(),
  ]);

  let loading = $state(true);

  let value = $state(10);

  $effect(() => {
    tutorialLandStore.stopRandomUpdates();
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

        if (accountManager?.getProvider()?.getAccount() == null) {
          console.info('The user is not logged in! Attempting login.');
          await accountManager?.getProvider()?.connect();
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
          goto('/onboarding/register');
          return;
        }

        if (
          address != null &&
          accountState.profile?.exists &&
          !accountState.profile?.whitelisted
        ) {
          console.info('The user needs to get whitelisted.');
          goto('/onboarding/whitelist');
          return;
        }

        console.log('Everything is ready!', dojo != undefined);

        tutorialEnabled.value = false;
        clearLoading();
        launchGame_sound.play();
      })
      .catch((err) => {
        console.error('An error occurred:', err);
        // TODO: Redirect to an error page!
      });
  });
</script>

<div class="h-screen w-screen bg-black/10 overflow-visible">
  <SwitchChainModal />

  {#if loading}
    <LoadingScreen {value} />
  {:else}
    <GameGrid />
    <GameUi />
  {/if}
</div>
