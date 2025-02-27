<script>
  import { dev } from '$app/environment';
  import { setupAccount } from '$lib/contexts/account.svelte';
  import { setupClient } from '$lib/contexts/client.svelte';
  import { setupStore } from '$lib/contexts/store.svelte';
  import { dojoConfig } from '$lib/dojoConfig';
  import Map from '$lib/components/map/map.svelte';
  import Ui from '$lib/components/ui.svelte';
  import LoadingScreen from '$lib/components/loading/loading-screen.svelte';
  import SwitchChainModal from '$lib/components/wallet/SwitchChainModal.svelte';
  import { particlesInit } from '@tsparticles/svelte';
  import { loadFull } from 'tsparticles';
  import { tsParticles } from '@tsparticles/engine';
  import { loadImageShape } from '@tsparticles/shape-image';
  import { getInfo } from '$lib/accounts/social/index.svelte';
  import Register from '$lib/components/socialink/register.svelte';
  import { state as accountState, setup } from '$lib/account.svelte';

  void particlesInit(async (engine) => {
    await loadFull(engine);
  });

  (async () => {
    await loadImageShape(tsParticles);
  })();

  const promise = Promise.all([
    setupClient(dojoConfig),
    setupAccount(),
    setupStore(),
    setup(),
  ]);

  let loading = $state(true);

  let showRegister = $derived((accountState.profile?.exists ?? false) == false);

  let value = $state(10);

  $effect(() => {
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
      .then(async ([_, accountManager]) => {
        if (accountManager?.getProvider()?.getAccount() == null) {
          console.info('The user is not logged in! Attempting login.');
          await accountManager?.getProvider()?.connect();
        }

        // Check if the user needs to signup with socialink
        const address = accountManager
          ?.getProvider()
          ?.getWalletAccount()?.address;

        clearLoading();
      })
      .catch((err) => {
        clearLoading();
      });
  });
</script>

<div class="h-screen w-screen bg-black/10 overflow-hidden">
  {#if loading}
    <LoadingScreen {value} />
  {:else if showRegister}
    <Register />
  {:else}
    <SwitchChainModal />
    <Map />
    <Ui />
  {/if}
</div>
