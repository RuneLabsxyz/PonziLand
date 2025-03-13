<script lang="ts">
  import { setupSocialink } from '$lib/accounts/social/index.svelte';
  import { Card } from '$lib/components/ui/card';
  import OnboardingWalletInfo from '$lib/components/wallet/onboarding-wallet-info.svelte';
  import type { LayoutData } from './$types';

  const { children } = $props();

  // Setup socialink
  setupSocialink();
</script>

<OnboardingWalletInfo />

<div
  class="w-screen h-screen inset-0 flex items-center justify-center bg-[#322637]"
>
  <Card class="flex flex-col min-w-96 min-h-96 bg-ponzi m-5">
    {@render children()}
  </Card>
</div>
