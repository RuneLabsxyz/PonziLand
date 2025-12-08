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
  import {
    devsettings,
    setAnimationPerformance,
  } from './three/utils/devsettings.store.svelte';
  import { GRID_SIZE } from '$lib/const';
  import { redbellyMainnet } from '@reown/appkit/networks';
  import {
    deviceStore,
    initDeviceDetection,
    getDevicePerformancePreset,
  } from '$lib/stores/device.store.svelte';
  import { onMount } from 'svelte';

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

  // Initialize device detection and auto-configure performance
  onMount(() => {
    const cleanup = initDeviceDetection();

    // Auto-configure performance based on device
    const performancePreset = getDevicePerformancePreset();
    setAnimationPerformance(performancePreset);

    // Log device detection
    console.log('Device detected:', {
      isMobile: deviceStore.isMobile,
      deviceType: deviceStore.deviceType,
      performancePreset,
    });

    return cleanup;
  });

  $effect(() => {
    if (!gameStore.cameraControls) return;
    gameStore.cameraControls.mouseButtons.left =
      devsettings.cameraControlsLeftClick as any;
    gameStore.cameraControls.mouseButtons.right =
      devsettings.cameraControlsRightClick as any;
    gameStore.cameraControls.mouseButtons.wheel =
      devsettings.CameraControlsWheel as any;
    gameStore.cameraControls.touches.one =
      devsettings.cameraControlsOneFinger as any;
    gameStore.cameraControls.touches.two =
      devsettings.cameraControlsTwoFinger as any;
    gameStore.cameraControls.touches.three =
      devsettings.cameraControlsThreeFinger as any;
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
          ref.touches.one = devsettings.cameraControlsOneFinger as any;
          ref.touches.two = devsettings.cameraControlsTwoFinger as any;
          ref.touches.three = devsettings.cameraControlsThreeFinger as any;
          // ref.smoothTime = 0.05;
          // ref.draggingSmoothTime = 0.02;
          // ref.dollySpeed = 2.0;
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
