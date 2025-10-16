import type { CameraControlsRef } from '@threlte/extras';

export class TutorialMapStore {
  cameraControls = $state<CameraControlsRef | null>(null);

  // Focus camera on specific coordinates
  focusOn(x: number, y: number, instant: boolean = false) {
    if (!this.cameraControls) return;

    this.cameraControls.setLookAt(
      x,
      50,
      y, // Camera position
      x,
      0,
      y, // Target position
      !instant, // Animate
    );
  }

  // Get current camera position
  getCameraPosition() {
    if (!this.cameraControls) return null;

    const position = this.cameraControls.camera.position;
    return {
      x: position.x,
      y: position.z, // Note: y in 2D space is z in 3D
    };
  }

  // Set zoom level
  setZoom(zoom: number, animate: boolean = true) {
    if (!this.cameraControls) return;

    this.cameraControls.zoomTo(zoom, animate);
  }
}

export const tutorialMapStore = new TutorialMapStore();
