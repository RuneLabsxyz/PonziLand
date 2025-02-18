<script lang="ts">
  import { getAuctions } from '$lib/api/auction.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { useActiveAuctions } from '$lib/stores/stores.svelte';

  const { store, client: sdk, accountManager } = useDojo();

  $effect(() => {
    sdk.client.actions.getActiveAuctions().then((res) => {
      console.log('Active auctions', res);
    });

    getAuctions().then((res) => {
      console.log('Auctions', res);
    });
  });

  let auctions = useActiveAuctions();
</script>

<div>Auctions</div>
<div>{JSON.stringify(auctions, null, 2)}</div>
