<script lang="ts">
  import { getAuctions } from '$lib/api/auction.svelte';
  import { useDojo } from '$lib/contexts/dojo';

  const { store, client: sdk, accountManager } = useDojo();

  $effect(() => {
    sdk.client.actions.getActiveAuctions().then((res) => {
      console.log('Active auctions', res);
    });

    getAuctions().then((res) => {
      console.log('Auctions', res);
    });
  });
</script>

<div>Auctions</div>
