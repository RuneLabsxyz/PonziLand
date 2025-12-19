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
  import {
    devsettings,
    setAnimationPerformance,
  } from '../utils/devsettings.store.svelte';
  import { cursorStore } from '../cursor.store.svelte';
  import type { ListOptions } from 'svelte-tweakpane-ui';
  import { landStore } from '$lib/stores/store.svelte';
  import { useClient } from '$lib/contexts/client.svelte';
  import { CAMERA_OPTIONS } from '$lib/utils/camera-options';
</script>

<Pane title="Dev Settings" position="draggable" x={0} y={120}>
  <Folder title="Camera" expanded={false}>
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
      options={CAMERA_OPTIONS}
    />
    <List
      bind:value={devsettings.cameraControlsRightClick}
      label="Camera Right Click"
      options={CAMERA_OPTIONS}
    />
    <List
      bind:value={devsettings.CameraControlsWheel}
      label="Camera Wheel"
      options={CAMERA_OPTIONS}
    />
    <List
      bind:value={devsettings.cameraControlsOneFinger}
      label="Touch One Finger"
      options={CAMERA_OPTIONS}
    />
    <List
      bind:value={devsettings.cameraControlsTwoFinger}
      label="Touch Two Finger"
      options={CAMERA_OPTIONS}
    />
    <List
      bind:value={devsettings.cameraControlsThreeFinger}
      label="Touch Three Finger"
      options={CAMERA_OPTIONS}
    />
    <Checkbox bind:value={devsettings.billboarding} label="Billboarding" />
  </Folder>
  <Folder title="Simulation" expanded={false}>
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
  <Folder title="Claim" expanded={false}>
    <Slider
      bind:value={devsettings.claimAllCount}
      label="Claim All land count"
      min={1}
      max={10}
      step={1}
    />
  </Folder>
  <Folder title="Layers" expanded={false}>
    <Checkbox bind:value={devsettings.showRoads} label="Roads" />
    <Checkbox bind:value={devsettings.showBiomes} label="Biomes" />
    <Checkbox bind:value={devsettings.showBuildings} label="Buildings" />
    <Checkbox bind:value={devsettings.showNukes} label="Nukes" />
    <Separator />
    <Checkbox bind:value={devsettings.showLandOverlay} label="Land Overlay" />
    <Checkbox
      bind:value={devsettings.showRatesOverlay}
      label="Rates Overlay Separate"
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
    <Checkbox bind:value={devsettings.showArtLayer} label="Art Layer" />
    <Checkbox bind:value={devsettings.showClouds} label="Clouds" />
    <Checkbox bind:value={devsettings.multiLandInfo} label="Multi Land Info" />
  </Folder>
  <Folder title="Animation Performance" expanded={false}>
    <Checkbox bind:value={devsettings.enableAnimations} label="Master Toggle" />
    <Separator />
    <Checkbox
      bind:value={devsettings.enableSpriteAnimations}
      label="Sprite Animations"
    />
    <Checkbox
      bind:value={devsettings.enableShaderAnimations}
      label="Shader Animations"
    />
    <Checkbox
      bind:value={devsettings.enableCloudAnimations}
      label="Cloud Animations"
    />
    <Checkbox
      bind:value={devsettings.enableNukeAnimations}
      label="Nuke Animations"
    />
    <Separator />
    <Checkbox
      bind:value={devsettings.reducedAnimationMode}
      label="Reduced Mode"
    />
    <Slider
      bind:value={devsettings.animationFPS}
      label="Animation FPS"
      min={5}
      max={60}
      step={5}
    />
    <Separator />
    <Button
      on:click={() => setAnimationPerformance('high')}
      label="Performance Preset"
      title="High"
    />
    <Button
      on:click={() => setAnimationPerformance('medium')}
      label="Performance Preset"
      title="Medium"
    />
    <Button
      on:click={() => setAnimationPerformance('low')}
      label="Performance Preset"
      title="Low"
    />
    <Button
      on:click={() => setAnimationPerformance('off')}
      label="Performance Preset"
      title="Off"
    />
  </Folder>
  <Folder title="Debug" expanded={false}>
    <Monitor label="Grid X" value={cursorStore.gridPosition?.x ?? -1} />
    <Monitor label="Grid Y" value={cursorStore.gridPosition?.y ?? -1} />
    <Monitor label="Grid ID" value={cursorStore.gridPosition?.id ?? -1} />
  </Folder>
</Pane>
