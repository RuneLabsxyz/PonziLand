<script lang="ts">
  import { HTML } from '@threlte/extras';
  import type { LandTile } from '$lib/components/+game-map/three/landTile';
  import { tutorialAttribute } from './stores.svelte';

  interface Props {
    tile: LandTile;
    i: number;
    positionOffset?: [number, number, number];
    scale?: number;
  }

  let { tile, i, positionOffset = [0, 0, 0], scale = 1 }: Props = $props();

  const position: [number, number, number] = $derived([
    tile.position[0] + positionOffset[0],
    tile.position[1] + positionOffset[1] + 0.5,
    tile.position[2] + positionOffset[2],
  ]);

  // Check if darkening should be enabled for map elements
  let showDarkening = $derived(tutorialAttribute('darken_map').has);
</script>

<HTML
  portal={document.getElementById('game-canvas') ?? document.body}
  {position}
  zIndexRange={[15, 5]}
  distanceFactor={0.01}
>
  <div
    class="highlight-effect"
    style="transform: translate(-50%, -50%) scale({scale})"
  >
    {#if showDarkening}
      <div class="black-overlay"></div>
    {/if}
    <div class="glow-border"></div>
  </div>
</HTML>

<style>
  .highlight-effect {
    position: relative;
    width: 100px;
    height: 100px;
    pointer-events: none;
  }

  .black-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 10000px;
    height: 10000px;
    background: #000000;
    opacity: 0.7;
    transform: translate(-50%, -50%);
    pointer-events: none;

    /* Create a hole in the center using clip-path */
    clip-path: polygon(
      0% 0%,
      0% 100%,
      49.5% 100%,
      49.5% 49.5%,
      50.5% 49.5%,
      50.5% 50.5%,
      49.5% 50.5%,
      49.5% 100%,
      100% 100%,
      100% 0%
    );
  }

  .glow-border {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100px;
    height: 100px;
    transform: translate(-50%, -50%);
    border: 3px solid #ffd700;
    border-radius: 8px;
    background: transparent;
    animation: goldGlow 2s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes goldGlow {
    0%,
    100% {
      box-shadow:
        0 0 10px rgba(255, 215, 0, 0.4),
        0 0 20px rgba(255, 215, 0, 0.2),
        inset 0 0 10px rgba(255, 215, 0, 0.1);
    }
    50% {
      box-shadow:
        0 0 20px rgba(255, 215, 0, 0.8),
        0 0 40px rgba(255, 215, 0, 0.4),
        inset 0 0 15px rgba(255, 215, 0, 0.2);
    }
  }
</style>
