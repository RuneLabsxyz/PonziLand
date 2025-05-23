<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import InfoTabs from './info-tabs.svelte';

  let { land }: { land: LandWithActions } = $props();
</script>

<div class="h-full w-full flex flex-col">
  <div class="w-full flex">
    <div class="">
      <LandOverview {land} size="lg" />
    </div>
    <InfoTabs {land} />
  </div>
</div>
