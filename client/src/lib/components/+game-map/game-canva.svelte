<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import {
    CameraControls,
    type CameraControlsRef,
    Grid,
    PerfMonitor,
  } from '@threlte/extras';
  import Scene from './game-scene.svelte';
  import { gameStore } from './three/game.store.svelte';
  import Settings from './three/Settings.svelte';
  import { devsettings } from './three/utils/devsettings.store.svelte';

  // Show dev tools if URL ends with #dev
  let showDevTools = $state(false);
  function checkDevHash() {
    showDevTools = window.location.hash === '#dev';
  }
  if (typeof window !== 'undefined') {
    checkDevHash();
    window.addEventListener('hashchange', checkDevHash);
  }

  $effect(() => {
    if (!gameStore.cameraControls) return;
    gameStore.cameraControls.mouseButtons.left =
      devsettings.cameraControlsLeftClick as any;
    gameStore.cameraControls.mouseButtons.right =
      devsettings.cameraControlsRightClick as any;
    gameStore.cameraControls.mouseButtons.wheel =
      devsettings.CameraControlsWheel as any;
  });
</script>

<div id="game-canvas" style="height: 100%; width: 100%;">
  <Canvas>
    {#if showDevTools}
      <PerfMonitor />
    {/if}
    <T.OrthographicCamera position={[32, 50, 32]} zoom={100} makeDefault>
      <CameraControls
        rotation={false}
        enableZoom={true}
        enablePan={true}
        panSpeed={1.0}
        screenSpacePanning={true}
        zoomToCursor
        enableDamping
        zoom0={5}
        minZoom={10}
        maxZoom={1000}
        bind:ref={gameStore.cameraControls}
        oncreate={(ref: CameraControlsRef) => {
          ref.setLookAt(32, 50, 32, 32, 0, 32, false);
          ref.mouseButtons.left = devsettings.cameraControlsLeftClick as any;
          ref.mouseButtons.right = devsettings.cameraControlsRightClick as any;
          ref.mouseButtons.wheel = devsettings.CameraControlsWheel as any;
        }}
      />
    </T.OrthographicCamera>
    {#if devsettings.showGrid}
      <Grid
        position={[30 - 0.5, 1, 30 - 0.5]}
        divisions={10}
        cellSize={1}
        cellColor="#ffffff"
        sectionColor="#ffff00"
        gridSize={64 + 20}
      />
    {/if}
    <Scene />
  </Canvas>
  {#if showDevTools}
    <Settings />
  {/if}
</div>

<style>
  div {
    height: 100%;
  }
</style>
