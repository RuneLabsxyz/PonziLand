<script lang="ts">
  import { devsettings } from '$lib/components/+game-map/three/utils/devsettings.store.svelte.js';
  import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import { HeatmapParameter } from '$lib/components/+game-ui/widgets/heatmap/heatmap.config';
  import { heatmapStore } from '$lib/stores/heatmap.svelte';
  import { Toggle } from '$lib/components/ui/toggle';
  import { onMount } from 'svelte';

  type MultipleValues = ('nuke' | 'rates')[];

  let multiple: MultipleValues = $state([]);

  onMount(() => {
    if (devsettings.showNukeTimes) multiple.push('nuke');
    if (devsettings.showRatesOverlay) multiple.push('rates');
  });

  $effect(() => {
    devsettings.showNukeTimes = multiple.includes('nuke');
    devsettings.showRatesOverlay = multiple.includes('rates');
  });

  type HeatmapState =
    | HeatmapParameter.SELL_PRICE
    | HeatmapParameter.STAKE_AMOUNT
    | HeatmapParameter.LEVEL
    | undefined;
  let heatmapState = $state<HeatmapState>();

  $effect(() => {
    if (heatmapState) {
      heatmapStore.setEnabled(true);
      heatmapStore.setParameter(heatmapState);
    } else {
      heatmapStore.setEnabled(false);
    }
  });
</script>

<div
  class="top-0 left-1/2 -translate-x-1/2 absolute z-2 p-2"
  style="pointer-events: all;"
>
  <div class="flex gap-2">
    <!-- <Toggle variant="map" size="sm" class="rounded">
      <img
        src="/ui/icons/Icon_Book.png"
        alt="Settings"
        class="inline h-4 w-4"
      />
    </Toggle> -->
    <ToggleGroup.Root
      class="overflow-hidden"
      size="sm"
      variant="map"
      type="single"
      value={heatmapState}
      onValueChange={(e) => (heatmapState = e as HeatmapState)}
    >
      <ToggleGroup.Item value={HeatmapParameter.SELL_PRICE}>
        <img
          src="/ui/icons/IconTiny_Stats.png"
          alt="Stats Icon"
          class="inline h-4 w-4"
        />
      </ToggleGroup.Item>
      <ToggleGroup.Item value={HeatmapParameter.LEVEL}>
        <img src="/ui/star/on.png" alt="Level" class="inline h-4 w-4" />
      </ToggleGroup.Item>
    </ToggleGroup.Root>
    <ToggleGroup.Root
      size="sm"
      variant="map"
      type="multiple"
      value={multiple}
      onValueChange={(e) => (multiple = e as MultipleValues)}
    >
      <ToggleGroup.Item value="nuke">
        <img
          src="/ui/icons/Icon_ShieldRed.png"
          alt="Stats Icon"
          class="inline h-4 w-4"
        />
      </ToggleGroup.Item>
      <ToggleGroup.Item value="rates">
        <img
          src="/ui/icons/Icon_Coin3.png"
          alt="Stats Icon"
          class="inline h-4 w-4"
        />
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  </div>
</div>
