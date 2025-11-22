<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import {
    CameraControls,
    type CameraControlsRef,
    Grid,
    PerfMonitor,
  } from '@threlte/extras';
  import { PCFSoftShadowMap } from 'three';
  import Scene from './game-scene.svelte';
  import { gameStore } from './three/game.store.svelte';
  import Debug from './three/debug/Debug.svelte';
  import { devsettings } from './three/utils/devsettings.store.svelte';
  import { GRID_SIZE } from '$lib/const';

  const CENTER = Math.floor(GRID_SIZE / 2);

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
    if (!gameStore.cameraControls || !gameStore.cameraControls.mouseButtons)
      return;
    gameStore.cameraControls.mouseButtons.left =
      devsettings.cameraControlsLeftClick as any;
    gameStore.cameraControls.mouseButtons.right =
      devsettings.cameraControlsRightClick as any;
    gameStore.cameraControls.mouseButtons.wheel =
      devsettings.CameraControlsWheel as any;
  });
</script>

<div id="game-canvas" style="height: 100%; width: 100%;">
  <Canvas shadows={PCFSoftShadowMap}>
    {#if showDevTools}
      <PerfMonitor />
    {/if}
    <T.OrthographicCamera
      position={[CENTER, 50, CENTER]}
      zoom={100}
      makeDefault
    >
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
          ref.setLookAt(CENTER, 50, CENTER, CENTER, 0, CENTER, false);
          ref.mouseButtons.left = devsettings.cameraControlsLeftClick as any;
          ref.mouseButtons.right = devsettings.cameraControlsRightClick as any;
          ref.mouseButtons.wheel = devsettings.CameraControlsWheel as any;
        }}
      />
    </T.OrthographicCamera>
    {#if devsettings.showGrid}
      <Grid
        position={[CENTER - 0.5, 1, CENTER - 0.5]}
        divisions={GRID_SIZE}
        cellSize={1}
        cellColor="#ffffff"
        sectionColor="#ffff00"
        gridSize={GRID_SIZE}
      />
    {/if}
    <Scene />
  </Canvas>
  {#if showDevTools}
    <Debug />
  {/if}
</div>

<style>
  div {
    height: 100%;
  }
</style>
