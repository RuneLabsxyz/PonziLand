<script lang="ts">
  import { goto } from '$app/navigation';
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import { setupSocialink } from '$lib/accounts/social/index.svelte';
  import OnboardingWalletInfo from '$lib/components/+game-ui/widgets/wallet/onboarding-wallet-info.svelte';
  import { Card } from '$lib/components/ui/card';
  import { FUSE_DISABLE_SOCIALINK } from '$lib/flags';

  import SwitchChainModal from '$lib/components/+game-ui/modals/SwitchChainModal.svelte';

  const { children } = $props();

  // Setup socialink
  const setupPromise = (async () => {
    if (!FUSE_DISABLE_SOCIALINK) {
      await setupSocialink();
    }
    setup();

    // Once all is ready, check for a redirect
    if (!accountDataProvider.isConnected) {
      goto('/onboarding/connect');
    } else if (FUSE_DISABLE_SOCIALINK) {
      // Skip onboarding entirely when socialink is disabled
      goto('/game');
    }
  })();

  const onConnect = async () => {
    if (FUSE_DISABLE_SOCIALINK) {
      goto('/game');
    } else if (!accountDataProvider.profile?.exists) {
      // redirect to the register
      goto('/onboarding/register');
    } else if (!accountDataProvider.profile?.whitelisted) {
      goto('/onboarding/whitelist');
    } else {
      goto('/game');
    }
  };
</script>

<OnboardingWalletInfo onconnect={onConnect} />

<SwitchChainModal />

<div
  class="w-screen h-screen inset-0 flex items-center justify-center bg-[#322637]"
>
  <Card class="flex flex-col min-w-96 min-h-96 bg-ponzi m-5">
    {#await setupPromise}
      <div class="flex flex-col items-center justify-center h-full grow">
        <h1 class="text-2xl font-bold pt-2">Loading...</h1>
        <div class="md:max-w-[50vw] opacity-90 p-5 gap-2 flex flex-col grow">
          <p>Please wait while we set up your account.</p>
        </div>
      </div>
    {:then}
      {@render children()}
    {/await}
  </Card>
</div>
