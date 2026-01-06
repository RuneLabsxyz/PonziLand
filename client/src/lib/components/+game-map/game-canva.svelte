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
  import {
    tutorialState,
    TUTORIAL_CAMERA,
  } from '$lib/components/tutorial/stores.svelte';

  const CENTER = Math.floor(GRID_SIZE / 2);

  // Derive camera settings based on tutorial mode
  let isTutorial = $derived(tutorialState.tutorialEnabled);
  let cameraZoom = $derived(isTutorial ? TUTORIAL_CAMERA.zoomLevel : 100);
  let enableZoom = $derived(!isTutorial || !TUTORIAL_CAMERA.lockControls);
  let enablePan = $derived(!isTutorial || !TUTORIAL_CAMERA.lockControls);

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
    // Disable all camera mouse controls during tutorial
    if (isTutorial && TUTORIAL_CAMERA.lockControls) {
      gameStore.cameraControls.mouseButtons.left = 0; // NONE
      gameStore.cameraControls.mouseButtons.right = 0; // NONE
      gameStore.cameraControls.mouseButtons.wheel = 0; // NONE
      gameStore.cameraControls.mouseButtons.middle = 0; // NONE
      gameStore.cameraControls.touches.one = 0; // NONE
      gameStore.cameraControls.touches.two = 0; // NONE
      gameStore.cameraControls.touches.three = 0; // NONE
    } else {
      gameStore.cameraControls.mouseButtons.left =
        devsettings.cameraControlsLeftClick as any;
      gameStore.cameraControls.mouseButtons.right =
        devsettings.cameraControlsRightClick as any;
      gameStore.cameraControls.mouseButtons.wheel =
        devsettings.CameraControlsWheel as any;
    }
  });

  // Apply tutorial camera settings when tutorial is enabled
  $effect(() => {
    if (!gameStore.cameraControls) return;
    if (isTutorial) {
      // Center camera on tutorial area with fixed zoom
      const { centerX, centerY, zoomLevel } = TUTORIAL_CAMERA;
      gameStore.cameraControls.setLookAt(
        centerX,
        50,
        centerY,
        centerX,
        0,
        centerY,
        true, // smooth animation
      );
      gameStore.cameraControls.zoomTo(zoomLevel, true);
    }
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
        {enableZoom}
        {enablePan}
        panSpeed={1.0}
        screenSpacePanning={true}
        zoomToCursor
        enableDamping
        zoom0={5}
        minZoom={isTutorial ? TUTORIAL_CAMERA.zoomLevel : 10}
        maxZoom={isTutorial ? TUTORIAL_CAMERA.zoomLevel : 1000}
        bind:ref={gameStore.cameraControls}
        oncreate={(ref: CameraControlsRef) => {
          const startX = isTutorial ? TUTORIAL_CAMERA.centerX : CENTER;
          const startY = isTutorial ? TUTORIAL_CAMERA.centerY : CENTER;
          const startZoom = isTutorial ? TUTORIAL_CAMERA.zoomLevel : 100;
          ref.setLookAt(startX, 50, startY, startX, 0, startY, false);
          if (isTutorial) {
            ref.zoomTo(startZoom, false);
            // Lock camera controls during tutorial
            if (TUTORIAL_CAMERA.lockControls) {
              ref.mouseButtons.left = 0;
              ref.mouseButtons.right = 0;
              ref.mouseButtons.wheel = 0;
              ref.mouseButtons.middle = 0;
              ref.touches.one = 0;
              ref.touches.two = 0;
              ref.touches.three = 0;
            }
          } else {
            ref.mouseButtons.left = devsettings.cameraControlsLeftClick as any;
            ref.mouseButtons.right =
              devsettings.cameraControlsRightClick as any;
            ref.mouseButtons.wheel = devsettings.CameraControlsWheel as any;
          }
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
