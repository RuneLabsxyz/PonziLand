import { writable } from 'svelte/store';
import { tweened } from 'svelte/motion';

export const cameraPosition = writable({
    scale: 1,
    offsetX: 0,
    offsetY: 0
});

export const cameraTransition = tweened({
    scale: 1,
    offsetX: 0,
    offsetY: 0
}, {
    duration: 500,
    easing: t => 1 - Math.pow(1 - t, 3)
});

cameraTransition.subscribe($camera => {
    cameraPosition.set($camera);
});

export function moveCameraTo(tileX: number, tileY: number, targetScale: number = 5) {
    const TILE_SIZE = 32; 
    
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
        offsetY: targetPixelY + centerOffsetY
    });
}
