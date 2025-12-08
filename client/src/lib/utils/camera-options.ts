import type { ListOptions } from 'svelte-tweakpane-ui';

/**
 * Camera control options for three.js camera controls.
 * These are bitwise flags that can be combined for different mouse/touch behaviors.
 */
export const CAMERA_OPTIONS = {
  NONE: 0b0,
  ROTATE: 0b1,
  TRUCK: 0b10,
  SCREEN_PAN: 0b100,
  OFFSET: 0b1000,
  DOLLY: 0b10000,
  ZOOM: 0b100000,
  TOUCH_ROTATE: 0b1000000,
  TOUCH_TRUCK: 0b10000000,
  TOUCH_SCREEN_PAN: 0b100000000,
  TOUCH_OFFSET: 0b1000000000,
  TOUCH_DOLLY: 0b10000000000,
  TOUCH_ZOOM: 0b100000000000,
  TOUCH_DOLLY_TRUCK: 0b1000000000000,
  TOUCH_DOLLY_SCREEN_PAN: 0b10000000000000,
  TOUCH_DOLLY_OFFSET: 0b100000000000000,
  TOUCH_DOLLY_ROTATE: 0b1000000000000000,
  TOUCH_ZOOM_TRUCK: 0b10000000000000000,
  TOUCH_ZOOM_OFFSET: 0b100000000000000000,
  TOUCH_ZOOM_SCREEN_PAN: 0b1000000000000000000,
  TOUCH_ZOOM_ROTATE: 0b10000000000000000000,
};

/**
 * Type for camera option values
 */
export type CameraOptionValue = number;

/**
 * Helper function to check if a camera option includes a specific flag
 */
export function hasCameraOption(
  value: CameraOptionValue,
  flag: CameraOptionValue,
): boolean {
  return (value & flag) === flag;
}

/**
 * Helper function to combine camera options
 */
export function combineCameraOptions(
  ...options: CameraOptionValue[]
): CameraOptionValue {
  return options.reduce((acc, option) => acc | option, 0);
}
