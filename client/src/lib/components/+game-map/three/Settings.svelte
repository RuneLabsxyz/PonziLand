<script lang="ts">
  import { Pane, Slider, List } from 'svelte-tweakpane-ui';
  import { devsettings } from './utils/devsettings.store.svelte';
  import type { ListOptions } from 'svelte-tweakpane-ui';

  const cameraOptions: ListOptions<number> = {
    NONE: 0b0,
    ROTATE: 0b1,
    TRUCK: 0b10,
    SCREEN_PAN: 0b100,
    OFFSET: 0b1000,
    DOLLY: 0b10000,
    ZOOM: 0b100000,
    TOUCH_ROTATE: 0b1000000,
    TOUCH_TRUCK: 0b10000000,
    TOUCH_SCREEN_PAN: 0b100000000,
    TOUCH_OFFSET: 0b1000000000,
    TOUCH_DOLLY: 0b10000000000,
    TOUCH_ZOOM: 0b100000000000,
    TOUCH_DOLLY_TRUCK: 0b1000000000000,
    TOUCH_DOLLY_SCREEN_PAN: 0b10000000000000,
    TOUCH_DOLLY_OFFSET: 0b100000000000000,
    TOUCH_DOLLY_ROTATE: 0b1000000000000000,
    TOUCH_ZOOM_TRUCK: 0b10000000000000000,
    TOUCH_ZOOM_OFFSET: 0b100000000000000000,
    TOUCH_ZOOM_SCREEN_PAN: 0b1000000000000000000,
    TOUCH_ZOOM_ROTATE: 0b10000000000000000000,
  };
</script>

<Pane title="Frustum Settings" position="fixed" x={0} y={100}>
  <Slider
    bind:value={devsettings.frustumPadding}
    label="Frustum Padding"
    min={-5}
    max={5}
    step={1}
  />
  <List
    bind:value={devsettings.cameraControlsLeftClick}
    label="Camera Left Click"
    options={cameraOptions}
  />
</Pane>
