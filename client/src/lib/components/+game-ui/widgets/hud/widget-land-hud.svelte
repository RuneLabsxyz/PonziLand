<script lang="ts">
  import account from '$lib/account.svelte';
  import LandHudAuction from '$lib/components/+game-map/land/hud/land-hud-auction.svelte';
  import LandHudInfo from '$lib/components/+game-map/land/hud/land-hud-info.svelte';
  import LandNukeTime from '$lib/components/+game-map/land/land-nuke-time.svelte';
  import LandOwnerInfo from '$lib/components/+game-map/land/land-owner-info.svelte';
  import { Card } from '$lib/components/ui/card';
  import { selectedLandWithActions } from '$lib/stores/store.svelte';
  import { padAddress } from '$lib/utils';

  const address = $derived(account.address);
  let landWithActions = $derived(selectedLandWithActions());

  let isOwner = $derived(
    landWithActions?.value?.owner === padAddress(address ?? ''),
  );
  let land = $derived(landWithActions?.value);
</script>

{#if land}
  {#if land.type !== 'auction'}
    <div class="absolute left-0 top-0 -translate-y-full">
      <LandOwnerInfo {land} {isOwner} />
    </div>
    <div class="absolute right-0 top-0 -translate-y-full">
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
{/if}
