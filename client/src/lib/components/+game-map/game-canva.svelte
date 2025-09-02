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

  let canvasError = $state(false);
  let errorMessage = $state('');
  let canvasReady = $state(false);

  // Check WebGL support before trying to render
  function checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!(gl && (gl as WebGLRenderingContext).getParameter);
    } catch (e) {
      return false;
    }
  }

  // Initialize canvas after component mounts
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      if (!checkWebGLSupport()) {
        canvasError = true;
        errorMessage = 'WebGL is not supported on this device or browser.';
      } else {
        canvasReady = true;
      }
    }, 100);
  }

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
  {#if canvasError}
    <div class="h-full w-full bg-black flex items-center justify-center">
      <div
        class="text-center p-8 bg-gray-900 rounded-lg border border-gray-700 max-w-sm"
      >
        <svg
          class="w-12 h-12 mx-auto text-red-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <h3 class="text-lg font-bold text-white mb-2">Rendering Error</h3>
        <p class="text-gray-300 text-sm mb-4">{errorMessage}</p>
        <button
          class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
          onclick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    </div>
  {:else if canvasReady}
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
            ref.mouseButtons.right =
              devsettings.cameraControlsRightClick as any;
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
  {/if}
</div>

<style>
  div {
    height: 100%;
  }
</style>
