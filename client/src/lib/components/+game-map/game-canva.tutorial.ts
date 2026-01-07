/**
 * Tutorial-specific logic for game-canva.svelte
 * Extracted to keep the main component focused on canvas setup.
 */

import type { CameraControlsRef } from '@threlte/extras';

/**
 * Camera control action values
 */
export const CAMERA_ACTION = {
  NONE: 0,
} as const;

/**
 * Lock all camera mouse and touch controls (used during tutorial)
 */
export function lockCameraControls(controls: CameraControlsRef): void {
  controls.mouseButtons.left = CAMERA_ACTION.NONE;
  controls.mouseButtons.right = CAMERA_ACTION.NONE;
  controls.mouseButtons.wheel = CAMERA_ACTION.NONE;
  controls.mouseButtons.middle = CAMERA_ACTION.NONE;
  controls.touches.one = CAMERA_ACTION.NONE;
  controls.touches.two = CAMERA_ACTION.NONE;
  controls.touches.three = CAMERA_ACTION.NONE;
}

/**
 * Apply default camera controls from devsettings
 */
export function applyDefaultCameraControls(
  controls: CameraControlsRef,
  leftClick: number,
  rightClick: number,
  wheel: number,
): void {
  controls.mouseButtons.left = leftClick as any;
  controls.mouseButtons.right = rightClick as any;
  controls.mouseButtons.wheel = wheel as any;
}

/**
 * Get camera settings based on tutorial mode
 */
export function getCameraSettings(
  isTutorial: boolean,
  tutorialCenterX: number,
  tutorialCenterY: number,
  tutorialZoom: number,
  defaultCenter: number,
  defaultZoom: number,
): {
  centerX: number;
  centerY: number;
  zoom: number;
} {
  return {
    centerX: isTutorial ? tutorialCenterX : defaultCenter,
    centerY: isTutorial ? tutorialCenterY : defaultCenter,
    zoom: isTutorial ? tutorialZoom : defaultZoom,
  };
}

/**
 * Get zoom constraints based on tutorial mode
 */
export function getZoomConstraints(
  isTutorial: boolean,
  tutorialZoom: number,
  defaultMinZoom: number,
  defaultMaxZoom: number,
): {
  minZoom: number;
  maxZoom: number;
} {
  return {
    minZoom: isTutorial ? tutorialZoom : defaultMinZoom,
    maxZoom: isTutorial ? tutorialZoom : defaultMaxZoom,
  };
}
