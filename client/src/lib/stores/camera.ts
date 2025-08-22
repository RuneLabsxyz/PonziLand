import { Tween } from 'svelte/motion';
import { TILE_SIZE } from '$lib/const';
import { parseLocation } from '$lib/utils';

export const cameraTransition = new Tween(
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

export const cameraPosition = $derived(cameraTransition.current);

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
  // Use correct coordinate system matching contracts
  const [tileX, tileY] = parseLocation(location);

  moveCameraTo(tileX + 1, tileY + 1, targetScale);
}
