<script lang="ts">
  import { goto } from '$app/navigation';
  import accountDataProvider from '$lib/account.svelte';

  import SelectWallet from '$lib/components/+game-ui/widgets/wallet/select-wallet.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';

  const accountManager = useAccount();

  $effect(() => {
    if (accountDataProvider.isConnected) {
      // Check if the account is deployed
      (async () => {
        // Check if the account is deployed
        try {
          await accountManager
            ?.getStarknetProvider()
            .getClassAt(accountDataProvider.address!);
        } catch (error) {
          goto('/onboarding/deploy');
          return;
        }

        if (accountDataProvider.profile?.exists) {
          goto('/onboarding/whitelist');
        } else {
          goto('/onboarding/register');
        }
      })();
    }
  });
</script>

<div class="flex flex-col h-full grow p-5 gap-2">
  <h1 class="text-2xl font-bold self-center mb-5">Welcome to PonziLand!</h1>
  <p>Connect using your wallet to join the fun!</p>

  <div class="mt-5 flex items-center justify-stretch w-full">
    <SelectWallet />
  </div>
</div>
