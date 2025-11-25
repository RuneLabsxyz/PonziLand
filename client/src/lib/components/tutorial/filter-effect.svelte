<script lang="ts">
  import { HTML } from '@threlte/extras';
  import type { LandTile } from '$lib/components/+game-map/three/landTile';

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
</script>

<HTML
  portal={document.getElementById('game-canvas') ?? document.body}
  {position}
  zIndexRange={[15, 5]}
  distanceFactor={0.01}
>
  <div
    class="black-square-effect"
    style="transform: translate(-50%, -50%) scale({scale})"
  >
    <div class="black-overlay"></div>
    <div class="center-glow"></div>
  </div>
</HTML>

<style>
  .black-square-effect {
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
    opacity: 0.5;
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

  .center-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100px;
    height: 100px;
    transform: translate(-50%, -50%);
    background: transparent;
    animation: whiteGlow 2s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes whiteGlow {
    0%,
    100% {
      background: rgba(255, 255, 255, 0);
      box-shadow: 0 0 0px rgba(255, 255, 255, 0);
    }
    50% {
      background: rgba(255, 255, 255, 0.3);
      box-shadow: 0 0 40px rgba(255, 255, 255, 0.6);
    }
  }
</style>
