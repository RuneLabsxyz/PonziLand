<script lang="ts">
  import { goto } from '$app/navigation';
  import { referralStore } from '$lib/stores/referral.store.svelte';
  import { onMount } from 'svelte';

  let { data }: { data: { code: string } } = $props();

  onMount(() => {
    const code = data.code;

    // Validate code format (6 alphanumeric characters)
    if (code && /^[A-Z0-9]{6}$/i.test(code)) {
      referralStore.setPendingReferral(code.toUpperCase());
    }

    // Redirect to game
    goto('/game');
  });
</script>

<div class="h-screen w-screen flex items-center justify-center bg-black">
  <p class="text-white text-xl">Redirecting...</p>
</div>
