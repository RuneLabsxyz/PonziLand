<script lang="ts">
  import { devsettings } from '$lib/components/+game-map/three/utils/devsettings.store.svelte.js';
  import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import { HeatmapParameter } from '$lib/components/+game-ui/widgets/heatmap/heatmap.config';
  import { heatmapStore } from '$lib/stores/heatmap.svelte';

  type MultipleValues = ('nuke' | 'rates')[];

  let multiple: MultipleValues = $state([]);

  $effect(() => {
    devsettings.showNukeTimes = multiple.includes('nuke');
    devsettings.showLandOverlay = multiple.includes('rates');
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
  class="top-0 left-1/2 -translate-x-1/2 absolute z-50 p-4"
  style="pointer-events: all;"
>
  <div class="flex gap-2">
    <ToggleGroup.Root
      type="single"
      variant="outline"
      value={heatmapState}
      onValueChange={(e) => (heatmapState = e as HeatmapState)}
    >
      <ToggleGroup.Item value={HeatmapParameter.SELL_PRICE}
        >Sell Price</ToggleGroup.Item
      >
      <ToggleGroup.Item value={HeatmapParameter.STAKE_AMOUNT}
        >Stake Amount</ToggleGroup.Item
      >
      <ToggleGroup.Item value={HeatmapParameter.LEVEL}
        >Land Level</ToggleGroup.Item
      >
    </ToggleGroup.Root>
    <ToggleGroup.Root
      type="multiple"
      variant="outline"
      value={multiple}
      onValueChange={(e) => (multiple = e as MultipleValues)}
    >
      <ToggleGroup.Item value="nuke">Nuke Times</ToggleGroup.Item>
      <ToggleGroup.Item value="rates">Rates</ToggleGroup.Item>
    </ToggleGroup.Root>
  </div>
</div>
