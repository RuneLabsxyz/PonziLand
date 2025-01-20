<script>
  import account from '$lib/account.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import { padAddress } from '$lib/utils';
  import { Card } from '../../ui/card';
  import LandHudAuction from './land-hud-auction.svelte';
  import LandHudEmpty from './land-hud-empty.svelte';
  import LandHudOther from './land-hud-other.svelte';
  import LandHudOwned from './land-hud-owned.svelte';

  const { store, client: sdk } = useDojo();

  const address = $derived(account.address);

  let isOwner = $derived($selectedLandMeta?.owner == padAddress(address ?? ''));
</script>

{#if $selectedLandMeta}
  <Card class="fixed bottom-0 right-0 z-50 w-96 bg-ponzi">
    {#if $selectedLandMeta.isAuction}
      <LandHudAuction />
    {:else if $selectedLandMeta.isEmpty}
      <LandHudEmpty />
    {:else if isOwner}
      <LandHudOwned />
    {:else}
      <LandHudOther />
    {/if}
  </Card>
{/if}
