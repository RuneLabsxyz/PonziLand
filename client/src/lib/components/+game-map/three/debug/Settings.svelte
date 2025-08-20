<script lang="ts">
  import {
    Pane,
    Folder,
    Slider,
    List,
    Checkbox,
    Button,
    Separator,
    Monitor,
  } from 'svelte-tweakpane-ui';
  import { devsettings } from '../utils/devsettings.store.svelte';
  import { cursorStore } from '../cursor.store.svelte';
  import type { ListOptions } from 'svelte-tweakpane-ui';
  import { landStore } from '$lib/stores/store.svelte';
  import { useClient } from '$lib/contexts/client.svelte';

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

<Pane title="Dev Settings" position="draggable" x={0} y={120}>
  <Folder title="Camera">
    <!-- <Slider
      bind:value={devsettings.frustumPadding}
      label="Frustum Padding"
      min={-5}
      max={5}
      step={1}
    /> -->
    <List
      bind:value={devsettings.cameraControlsLeftClick}
      label="Camera Left Click"
      options={cameraOptions}
    />
    <List
      bind:value={devsettings.cameraControlsRightClick}
      label="Camera Right Click"
      options={cameraOptions}
    />
    <List
      bind:value={devsettings.CameraControlsWheel}
      label="Camera Wheel"
      options={cameraOptions}
    />
    <Checkbox bind:value={devsettings.billboarding} label="Billboarding" />
  </Folder>
  <Folder title="Simulation">
    <Button
      on:click={() => landStore.startRandomUpdates()}
      label="Random Updates"
      title="Start"
    />
    <Button
      on:click={() => landStore.stopRandomUpdates()}
      label="Random Updates"
      title="Stop"
    />
    <Button
      on:click={() => landStore.setup(useClient())}
      label="Reload Lands"
      title="Reload"
    />
    <Button
      on:click={() => landStore.palette()}
      label="Test Lands"
      title="Palette"
    />
    <Button
      on:click={() => landStore.fakeSetup()}
      label="Fill Grid"
      title="Random Buildings"
    />
    <Slider
      bind:value={devsettings.minRandomUpdates}
      label="Min Random Updates"
      min={1}
      max={100}
      step={1}
    />
    <Slider
      bind:value={devsettings.maxRandomUpdates}
      label="Max Random Updates"
      min={1}
      max={100}
      step={1}
    />
    <Slider
      bind:value={devsettings.nukeRate}
      label="Nuke Probability"
      min={0}
      max={1}
      step={0.01}
    />
    <Slider
      bind:value={devsettings.updateInterval}
      label="Update Interval (ms)"
      min={100}
      max={5000}
      step={100}
    />
  </Folder>
  <Folder title="Layers">
    <Checkbox bind:value={devsettings.showRoads} label="Roads" />
    <Checkbox bind:value={devsettings.showBiomes} label="Biomes" />
    <Checkbox bind:value={devsettings.showBuildings} label="Buildings" />
    <Checkbox bind:value={devsettings.showNukes} label="Nukes" />
    <Separator />
    <Checkbox bind:value={devsettings.showLandOverlay} label="Land Overlay" />
    <Checkbox
      bind:value={devsettings.showOwnedLandOverlay}
      label="Owned Land Darken"
    />
    <Separator />
    <Checkbox
      bind:value={devsettings.showOwnerIndicator}
      label="OwnerIndicator"
    />
    <Checkbox bind:value={devsettings.showCoins} label="Coins" />
    <Checkbox bind:value={devsettings.showNukeTimes} label="Nuke Times" />
    <Separator />
    <Checkbox bind:value={devsettings.showGrid} label="Grid" />
    <Checkbox bind:value={devsettings.showUI} label="UI" />
    <Separator />
    <Checkbox bind:value={devsettings.showFog} label="Fog Layer" />
    <Checkbox bind:value={devsettings.showArtLayer} label="Art Layer" />
    <Slider
      bind:value={devsettings.artLayerOpacity}
      label="Art Layer Opacity"
      min={0}
      max={1}
      step={0.1}
    />
  </Folder>
  <Folder title="Debug">
    <Monitor label="Grid X" value={cursorStore.gridPosition?.x ?? -1} />
    <Monitor label="Grid Y" value={cursorStore.gridPosition?.y ?? -1} />
    <Monitor label="Grid ID" value={cursorStore.gridPosition?.id ?? -1} />
  </Folder>
</Pane>
