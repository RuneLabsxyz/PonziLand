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
  let billboarding = true;
</script>

<div id="game-canvas" style="height: 100%; width: 100%;">
  <Canvas>
    <PerfMonitor />
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
          ref.setLookAt(32, 50, 32, 32, 0, 32, true);
        }}
      />
    </T.OrthographicCamera>
    <Grid
      position={[30 - 0.5, 1, 30 - 0.5]}
      divisions={10}
      cellSize={1}
      cellColor="#ffffff"
      sectionColor="#ffff00"
      gridSize={64 + 20}
    />
    <Scene {billboarding} />
  </Canvas>
</div>

<style>
  div {
    height: 100%;
  }
</style>
