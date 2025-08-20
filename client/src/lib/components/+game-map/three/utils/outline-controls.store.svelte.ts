import type { OutlineControls } from './sprite-hover-shader';
import * as THREE from 'three';

interface OutlineControlsStore {
  buildingControls: OutlineControls | null;
  biomeControls: OutlineControls | null;
  buildingSprite: THREE.InstancedMesh | null;
  biomeSprite: THREE.InstancedMesh | null;
}

// Create a reactive store to hold references to outline controls
const outlineControlsStore = $state<OutlineControlsStore>({
  buildingControls: null,
  biomeControls: null,
  buildingSprite: null,
  biomeSprite: null,
});

export function setOutlineControls(
  layer: 'building' | 'biome',
  controls: OutlineControls | null,
  sprite: THREE.InstancedMesh | null = null,
) {
  if (layer === 'building') {
    outlineControlsStore.buildingControls = controls;
    if (sprite) outlineControlsStore.buildingSprite = sprite;
  } else {
    outlineControlsStore.biomeControls = controls;
    if (sprite) outlineControlsStore.biomeSprite = sprite;
  }
}

export function getOutlineControls() {
  return outlineControlsStore;
}

// Convenience function to apply outlines to all layers
export function applyOutlinesToAllLayers(
  instanceIndices: number[],
  color: THREE.Color,
) {
  const store = getOutlineControls();

  if (store.buildingControls && store.buildingSprite) {
    store.buildingControls.setCustomOutlines(
      store.buildingSprite,
      instanceIndices,
      color,
    );
  }

  if (store.biomeControls && store.biomeSprite) {
    store.biomeControls.setCustomOutlines(
      store.biomeSprite,
      instanceIndices,
      color,
    );
  }
}

// Convenience function to clear outlines from all layers
export function clearOutlinesFromAllLayers() {
  const store = getOutlineControls();

  if (store.buildingControls && store.buildingSprite) {
    store.buildingControls.clearOutlines(store.buildingSprite);
  }

  if (store.biomeControls && store.biomeSprite) {
    store.biomeControls.clearOutlines(store.biomeSprite);
  }
}
