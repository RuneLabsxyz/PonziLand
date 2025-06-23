<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import { Grid, OrbitControls, PerfMonitor } from '@threlte/extras';
  import Scene from './game-scene.svelte';
  let billboarding = true;
</script>

<div>
  <Canvas>
    <PerfMonitor />
    <T.OrthographicCamera position={[32, 50, 32]} zoom={100} makeDefault>
      <OrbitControls
        enableRotate={false}
        enableZoom={true}
        enablePan={true}
        panSpeed={1.0}
        screenSpacePanning={true}
        zoomToCursor
        enableDamping
        zoom0={5}
        minZoom={10}
        maxZoom={2000}
        target={[32, 0, 32]}
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
