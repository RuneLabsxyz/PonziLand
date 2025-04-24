<script>
  import account from '$lib/account.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import { padAddress } from '$lib/utils';
  import { Card, CardContent } from '../../ui/card';
  import LandHudAuction from './land-hud-auction.svelte';
  import LandHudEmpty from './land-hud-empty.svelte';
  import LandNukeTime from '../land-nuke-time.svelte';
  import LandOwnerInfo from '../land-owner-info.svelte';
  import LandHudInfo from './land-hud-info.svelte';

  const address = $derived(account.address);

  let isOwner = $derived($selectedLandMeta?.owner == padAddress(address ?? ''));

  let land = $derived($selectedLandMeta);
</script>

{#if $selectedLandMeta}
  <Card class="fixed bottom-0 right-0 z-50 w-104 bg-ponzi">
    {#if $selectedLandMeta.type === 'house'}
      <LandOwnerInfo {land} {isOwner} />
    {/if}
    {#if $selectedLandMeta.type === 'house'}
      <LandNukeTime {land} />
    {/if}
    {#if $selectedLandMeta.type === 'auction'}
      <LandHudAuction />
    {:else if $selectedLandMeta.type === 'grass'}
      <LandHudEmpty />
    {:else}
      <LandHudInfo {land} {isOwner} />
    {/if}
  </Card>
{/if}
