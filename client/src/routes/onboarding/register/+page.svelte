<script lang="ts">
  import Register from '$lib/components/socialink/register.svelte';
  import { onMount } from 'svelte';
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import { goto } from '$app/navigation';
  import { useAccount } from '$lib/contexts/account.svelte';

  const accountManager = useAccount();

  // Do not keep people there if they already have an account name
  onMount(async () => {
    if (accountDataProvider.profile?.exists) {
      goto('/onboarding/whitelist');
    }

    accountManager
      ?.getStarknetProvider()
      .getClassAt(accountDataProvider.address!)
      .then(() => {
        // Account exists, so we can proceed to registration (the current page)
      })
      .catch((error) => {
        goto('/onboarding/deploy');
        return;
      });
  });

  function onFinish(username: string) {
    if (
      accountDataProvider.profile?.exists &&
      accountDataProvider.profile?.whitelisted
    ) {
      // This is highly improbable, but we'll handle it gracefully
      goto('/game');
    } else {
      goto('/onboarding/whitelist');
    }
  }
</script>

<Register onfinish={onFinish} />
