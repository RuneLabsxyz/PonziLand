<script lang="ts">
  import { devsettings } from '$lib/components/+game-map/three/utils/devsettings.store.svelte.js';
  import { HeatmapParameter } from '$lib/components/+game-ui/widgets/heatmap/heatmap.config';
  import Card from '$lib/components/ui/card/card.svelte';
  import { Separator } from '$lib/components/ui/separator';
  import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import { heatmapStore } from '$lib/stores/heatmap.svelte';
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
  class="top-0 left-1/2 -translate-x-1/2 absolute z-2"
  style="pointer-events: all;"
>
  <Card class="bg-ponzi">
    <div class="flex gap-2 -m-2">
      <!-- <Toggle variant="map" size="sm" class="rounded">
      <img
        src="/ui/icons/Icon_Book.png"
        alt="Settings"
        class="inline h-4 w-4"
      />
    </Toggle> -->
      <ToggleGroup.Root
        class="rounded-none"
        size="sm"
        variant="map"
        type="single"
        value={heatmapState}
        onValueChange={(e) => (heatmapState = e as HeatmapState)}
      >
        <ToggleGroup.Item value={HeatmapParameter.SELL_PRICE}>
          <div
            class="flex items-center justify-center h-4 w-4 font-ponzi-number text-xs stroke-3d-black"
          >
            $
          </div>
        </ToggleGroup.Item>
        <ToggleGroup.Item value={HeatmapParameter.LEVEL}>
          <div
            class="flex items-center justify-center h-4 w-4 font-ponzi-number text-xs stroke-3d-black"
          >
            lvl
          </div>
        </ToggleGroup.Item>
      </ToggleGroup.Root>
      <Separator orientation="vertical" class="my-2 opacity-50" />
      <ToggleGroup.Root
        size="sm"
        variant="map"
        class="rounded-none"
        type="multiple"
        value={multiple}
        onValueChange={(e) => (multiple = e as MultipleValues)}
      >
        <ToggleGroup.Item value="nuke">
          <img
            src="/ui/icons/Icon_ShieldRed.png"
            alt="Stats Icon"
            class="inline h-5 w-5"
          />
        </ToggleGroup.Item>
        <ToggleGroup.Item value="rates">
          <img
            src="/ui/icons/Icon_Coin3.png"
            alt="Stats Icon"
            class="inline h-5 w-5"
          />
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </div>
  </Card>
</div>
