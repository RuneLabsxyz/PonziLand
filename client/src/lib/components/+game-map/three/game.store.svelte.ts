import type { CameraControlsRef } from '@threlte/extras';

export let gameStore: { cameraControls?: CameraControlsRef } = $state({
  cameraControls: undefined,
});
