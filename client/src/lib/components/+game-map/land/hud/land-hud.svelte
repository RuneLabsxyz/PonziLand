<script lang="ts">
  import account from '$lib/account.svelte';
  import { Card } from '$lib/components/ui/card';
  import { selectedLandWithActions } from '$lib/stores/store.svelte';
  import { padAddress } from '$lib/utils';
  import LandNukeTime from '../land-nuke-time.svelte';
  import LandOwnerInfo from '../land-owner-info.svelte';
  import LandHudAuction from './land-hud-auction.svelte';
  import LandHudInfo from './land-hud-info.svelte';

  const address = $derived(account.address);
  let landWithActions = $derived(selectedLandWithActions());

  let isOwner = $derived(
    landWithActions?.value?.owner === padAddress(address ?? ''),
  );
  let land = $derived(landWithActions?.value);
</script>

{#if land}
  <Card class="z-50 w-104 bg-ponzi">
    {#if land}
      <LandOwnerInfo {land} {isOwner} />
      <div class="absolute right-0 -translate-y-12">
        <Card>
          <LandNukeTime {land} />
        </Card>
      </div>
    {/if}
    {#if land.type === 'auction'}
      <LandHudAuction {land} />
    {:else if land.type === 'grass'}
      <!-- <LandHudEmpty /> -->
    {:else}
      <LandHudInfo {land} {isOwner} showLand={true} />
    {/if}
  </Card>
{/if}
