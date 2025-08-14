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
  import { onMount } from 'svelte';
  import { devsettings } from '$lib/components/+game-map/three/utils/devsettings.store.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';

  const promise = Promise.all([
    setupSocialink().then(() => {
      return setupAccountState();
    }),
    setupClient().then((client) => {
      landStore.setup(client!);
      landStore.stopRandomUpdates();
      // landStore.startRandomUpdates();
    }),
    setupAccount(),
  ]);

  let loading = $state(true);

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

        tutorialState.tutorialEnabled = false;
        widgetsStore.removeWidget('tutorial');
        clearLoading();
        gameSounds.play('launchGame');
      })
      .catch((err) => {
        console.error('An error occurred:', err);
        // TODO: Redirect to an error page!
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

  {#if loading}
    <LoadingScreen {value} />
  {:else}
    <GameCanva />
    {#if devsettings.showUI}
      <GameUi />
    {/if}
  {/if}
</div>
