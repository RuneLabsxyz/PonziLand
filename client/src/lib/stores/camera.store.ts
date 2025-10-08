import { get, writable } from 'svelte/store';
import { tweened } from 'svelte/motion';
import { TILE_SIZE } from '$lib/const';
import { parseLocation } from '$lib/utils';
import { gameStore } from '$lib/components/+game-map/three/game.store.svelte';
import { landStore, selectedLand } from './store.svelte';
import { cursorStore } from '$lib/components/+game-map/three/cursor.store.svelte';

export const cameraPosition = writable({
  scale: 1,
  offsetX: 0,
  offsetY: 0,
});

export const cameraTransition = tweened(
  {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  },
  {
    duration: 500,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  },
);

cameraTransition.subscribe(($camera) => {
  cameraPosition.set($camera);
});

export function moveCameraTo(
  tileX: number,
  tileY: number,
  targetScale: number = 1,
) {
  // Calculate the target position in pixels
  const targetPixelX = -(tileX - 1) * TILE_SIZE * targetScale;
  const targetPixelY = -(tileY - 1) * TILE_SIZE * targetScale;

  const viewportWidth = window.innerWidth - 64;
  const viewportHeight = window.innerHeight - 64;

  const centerOffsetX = (viewportWidth - TILE_SIZE * targetScale) / 2;
  const centerOffsetY = (viewportHeight - TILE_SIZE * targetScale) / 2;

  cameraTransition.set({
    scale: targetScale,
    offsetX: targetPixelX + centerOffsetX,
    offsetY: targetPixelY + centerOffsetY,
  });
}

export function moveCameraToLocation(location: number, targetScale?: number) {
  console.log('Moving camera to location:', location);
  // Use correct coordinate system matching contracts
  const [tileX, tileY] = parseLocation(location);

  gameStore.cameraControls?.setLookAt(tileX, 50, tileY, tileX, 0, tileY, true);
}

export function selectLand(location: number, targetScale?: number) {
  console.log('Selecting land:', location);
  // Use correct coordinate system matching contracts
  const [tileX, tileY] = parseLocation(location);

  const baseLand = landStore.getLand(tileX, tileY);

  if (baseLand) {
    selectedLand.value = get(baseLand);
  }

  if (cursorStore.selectedTileIndex == location) {
    gameStore.cameraControls?.zoomTo(250, true);
  }

  cursorStore.selectedTileIndex = location;

  gameStore.cameraControls?.setLookAt(tileX, 50, tileY, tileX, 0, tileY, true);
}
