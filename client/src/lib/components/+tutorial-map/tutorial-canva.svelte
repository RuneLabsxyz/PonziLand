<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import { CameraControls, Grid } from '@threlte/extras';
  import { PCFSoftShadowMap } from 'three';
  import TutorialScene from './tutorial-scene.svelte';
  import { tutorialMapStore } from './tutorial-map.store.svelte';
  import { GRID_SIZE } from '$lib/const';
  import { tutorialStore } from '$lib/stores/tutorial.store.svelte';

  const CENTER = Math.floor(GRID_SIZE / 2);

  // Check if current step allows camera controls
  let canPan = $derived(tutorialStore.isActionAllowed('pan'));
  let canZoom = $derived(tutorialStore.isActionAllowed('zoom'));
</script>

<div id="tutorial-canvas" style="height: 100%; width: 100%;">
  <Canvas shadows={PCFSoftShadowMap}>
    <T.OrthographicCamera
      position={[CENTER, 50, CENTER]}
      zoom={150}
      makeDefault
    >
      <CameraControls
        rotation={false}
        enableZoom={canZoom}
        enablePan={canPan}
        panSpeed={1.0}
        screenSpacePanning={true}
        zoomToCursor
        enableDamping
        zoom0={5}
        minZoom={50}
        maxZoom={500}
        bind:ref={tutorialMapStore.cameraControls}
        oncreate={(ref) => {
          // Focus on tutorial area
          ref.setLookAt(128, 50, 128, 128, 0, 128, false);
        }}
      />
    </T.OrthographicCamera>

    <!-- Grid -->
    <Grid
      position={[CENTER - 0.5, 1, CENTER - 0.5]}
      divisions={GRID_SIZE}
      cellSize={1}
      cellColor="#444444"
      sectionColor="#666666"
      gridSize={GRID_SIZE}
    />

    <!-- Lights -->
    <T.AmbientLight intensity={0.5} />
    <T.DirectionalLight
      position={[CENTER + 50, 100, CENTER - 50]}
      intensity={1}
      castShadow
    />

    <TutorialScene />
  </Canvas>
</div>

<style>
  div {
    height: 100%;
  }
</style>
