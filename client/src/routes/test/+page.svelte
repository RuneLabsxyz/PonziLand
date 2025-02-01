<script>
  import Swap from '$lib/components/swap/swap.svelte';

  import { setupAccount } from '$lib/contexts/account';
  import { setupClient } from '$lib/contexts/client';
  import { setupStore } from '$lib/contexts/store';
  import { dojoConfig } from '$lib/dojoConfig';

  const promise = Promise.all([
    setupClient(dojoConfig),
    setupAccount(),
    setupStore(),
  ]);
</script>

{#await promise then _}
  <Swap />
{/await}
