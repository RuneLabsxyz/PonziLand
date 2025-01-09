<script>
  import { accountAddress } from '$lib/stores/stores';
  import Button from '../ui/button/button.svelte';
  import Card from '../ui/card/card.svelte';
</script>

<div class="fixed top-0 right-0 z-50">
  {#if $accountAddress}
    <Card>
      <p>Wallet: {$accountAddress}</p>
    </Card>
  {:else}
    <Button class="m-2">Connect Wallet</Button>
  {/if}
</div>
