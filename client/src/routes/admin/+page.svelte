<script lang="ts">
  import { useLands } from '$lib/api/land.svelte';
  import AuctionAdmin from '$lib/components/auction/auction-admin.svelte';
  import BuySellForm from '$lib/components/buy/buy-sell-form.svelte';
  import ThreeDots from '$lib/components/loading/three-dots.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { setupAccount } from '$lib/contexts/account.svelte';
  import { setupClient } from '$lib/contexts/client.svelte';
  import { setupStore } from '$lib/contexts/store.svelte';
  import { dojoConfig } from '$lib/dojoConfig';
  import type { Token } from '$lib/interfaces';
  import { selectedLand } from '$lib/stores/stores.svelte';

  const promise = Promise.all([
    setupClient(dojoConfig),
    setupAccount(dojoConfig),
    setupStore(),
  ]);
</script>

{#await promise}
  <div>Loading <ThreeDots /></div>
{:then _}
  <AuctionAdmin />
{/await}
