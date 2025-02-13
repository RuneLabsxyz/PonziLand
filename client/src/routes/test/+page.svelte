<script>
  import Swap from '$lib/components/swap/swap.svelte';

  import { setupAccount } from '$lib/contexts/account.svelte';
  import { setupClient } from '$lib/contexts/client.svelte';
  import { setupStore } from '$lib/contexts/store.svelte';
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
