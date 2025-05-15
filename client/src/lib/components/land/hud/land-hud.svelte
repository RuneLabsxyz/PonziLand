<script>
  import account from '$lib/account.svelte';
  import { padAddress } from '$lib/utils';
  import { selectedLandWithActions } from '../../../../routes/next/store.svelte';
  import { Card } from '../../ui/card';
  import LandNukeTime from '../land-nuke-time.svelte';
  import LandOwnerInfo from '../land-owner-info.svelte';
  import LandHudAuction from './land-hud-auction.svelte';
  import LandHudEmpty from './land-hud-empty.svelte';
  import LandHudInfo from './land-hud-info.svelte';

  const address = $derived(account.address);
  let landWithActions = $derived(selectedLandWithActions());

  let isOwner = $derived(
    landWithActions.value?.owner == padAddress(address ?? ''),
  );
  let land = $derived(landWithActions.value);

  $inspect(land);
</script>

{#if land}
  <Card class="z-50 w-104 bg-ponzi">
    {#if land.type === 'house'}
      <LandOwnerInfo {land} {isOwner} />
    {/if}
    {#if land.type === 'house'}
      <div class="absolute right-0 -translate-y-12">
        <Card>
          <LandNukeTime {land} />
        </Card>
      </div>
    {/if}
    {#if land.type === 'auction'}
      <LandHudAuction />
    {:else if land.type === 'grass'}
      <LandHudEmpty />
    {:else}
      <LandHudInfo {land} {isOwner} showLand={true} />
    {/if}
  </Card>
{/if}
