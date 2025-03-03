<script lang="ts">
  import { getSocialink } from '$lib/accounts/social/index.svelte';
  import { onMount } from 'svelte';
  import Card from '../ui/card/card.svelte';
  import { Button } from '../ui/button';
  import { refresh } from '$lib/account.svelte';

  const socialink = getSocialink();

  function startInvitation() {
    socialink.startInvitation().then((tx: string) => {
      // We can force the reload of the account data
      console.log('Invitation finished, tx:', tx);
      refresh();
    });
  }
</script>

<div class="fixed inset-0 flex items-center justify-center z-50 bg-[#322637]">
  <Card class="pointer-events-auto p-5 bg-ponzi">
    <h1 class="text-2xl font-bold">Whitelist</h1>
    <p class="text-lg">Validate your account to access the game.</p>

    <Button class="mt-4" on:click={startInvitation}>Validate Account</Button>
  </Card>
</div>
