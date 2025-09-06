<script lang="ts">
  import { getSocialink } from '$lib/accounts/social/index.svelte';

  import { Button } from '$lib/components/ui/button';
</script>

<div class="flex flex-col h-full grow p-5 gap-2">
  <h1 class="text-2xl font-bold self-center mb-5">Claim your tokens!</h1>

  <Button onclick={() => getSocialink()?.claimTokens()}
    >Check your claiming status</Button
  >
</div>
