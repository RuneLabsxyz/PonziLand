<script lang="ts">
  import { devsettings } from '$lib/components/+game-map/three/utils/devsettings.store.svelte.js';
  import * as ToggleGroup from '$lib/components/ui/toggle-group';

  type MultipleValues = ('nuke' | 'rates')[];

  let multiple: MultipleValues = $state([]);

  $effect(() => {
    devsettings.showNukeTimes = multiple.includes('nuke');
    devsettings.showLandOverlay = multiple.includes('rates');
  });
</script>

<div
  class="top-0 left-1/2 -translate-x-1/2 absolute z-50 p-4"
  style="pointer-events: all;"
>
  <div class="flex gap-2">
    <ToggleGroup.Root type="single" variant="outline">
      <ToggleGroup.Item value="a">A</ToggleGroup.Item>
      <ToggleGroup.Item value="b">B</ToggleGroup.Item>
      <ToggleGroup.Item value="c">C</ToggleGroup.Item>
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
