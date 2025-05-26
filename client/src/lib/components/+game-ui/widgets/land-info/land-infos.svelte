<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import LandOwnerInfo from '$lib/components/+game-map/land/land-owner-info.svelte';
  import InfoTabs from './info-tabs.svelte';
  import account from '$lib/account.svelte';
  import { padAddress } from '$lib/utils';
  import LandNukeTime from '$lib/components/+game-map/land/land-nuke-time.svelte';
  import Card from '$lib/components/ui/card/card.svelte';

  let { land }: { land: LandWithActions } = $props();

  let address = $derived(account.address);
  let isOwner = $derived(land?.owner === padAddress(address ?? ''));
</script>

<div class="h-full w-full flex flex-col">
  <div class="w-full flex">
    <div class="flex flex-col items-center">
      <div class="absolute left-0 top-0 -translate-y-full">
        {#if !isOwner}
          <LandOwnerInfo {land} {isOwner} />
        {/if}
      </div>
      <LandOverview {land} size="lg" />
      <div class="absolute top-0 right-0 -translate-y-full">
        <Card>
          <LandNukeTime {land} />
        </Card>
      </div>
    </div>
    <InfoTabs {land} />
  </div>
</div>
