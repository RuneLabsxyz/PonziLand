/**
 * Centralized tutorial constants
 *
 * All tutorial-related magic numbers and coordinates should be defined here
 * to ensure consistency across the codebase and easy modification.
 */

/**
 * Tutorial map coordinates - all tutorial lands are placed relative to these positions
 */
export const TUTORIAL_COORDS = {
  /** Center of the tutorial area (128, 128) - player's first land */
  CENTER: { x: 128, y: 128 },
  /** Second auction position (127, 127) - diagonal from center */
  SECOND_AUCTION: { x: 127, y: 127 },
  /** Full auction position (127, 128) - left of center */
  FULL_AUCTION: { x: 127, y: 128 },
  /** Neighbor land to nuke (129, 128) - right of center */
  NEIGHBOR_TO_NUKE: { x: 129, y: 128 },
} as const;

/**
 * Tutorial camera settings
 */
export const TUTORIAL_CAMERA_CONFIG = {
  /** Zoom level (higher = closer view) */
  ZOOM_LEVEL: 280,
  /** Camera center X coordinate */
  CENTER_X: TUTORIAL_COORDS.CENTER.x,
  /** Camera center Y coordinate */
  CENTER_Y: TUTORIAL_COORDS.CENTER.y,
  /** Whether to lock camera controls during tutorial */
  LOCK_CONTROLS: true,
} as const;

/**
 * Tutorial outro cinematic settings
 */
export const TUTORIAL_OUTRO_CONFIG = {
  /** Duration of zoom out animation (ms) */
  ZOOM_DURATION: 12000,
  /** Duration of activity phase after zoom (ms) */
  ACTIVITY_DURATION: 4000,
  /** Pause duration on empty map (ms) */
  PAUSE_DURATION: 1500,
  /** Land spawn interval (ms) */
  SPAWN_INTERVAL: 100,
  /** Nuke interval (ms) */
  NUKE_INTERVAL: 2000,
  /** Starting zoom level for outro */
  START_ZOOM: 280,
  /** Ending zoom level for outro */
  END_ZOOM: 50,
  /** Starting radius for land spawning */
  START_RADIUS: 2,
  /** Maximum radius for land spawning */
  MAX_RADIUS: 45,
} as const;

/**
 * Tutorial dialog UI settings
 */
export const TUTORIAL_DIALOG_CONFIG = {
  /** Dialog width in pixels */
  DIALOG_WIDTH: 480,
  /** Dialog height in pixels */
  DIALOG_HEIGHT: 120,
  /** Spacing from widgets */
  WIDGET_SPACING: 40,
  /** Spacing from map elements */
  MAP_SPACING: 180,
  /** Right padding for fixed positions */
  RIGHT_PADDING: 650,
} as const;

/**
 * Tutorial timing constants for animations and delays
 */
export const TUTORIAL_TIMING = {
  /** Delay before auto-advancing to next step (ms) */
  AUTO_ADVANCE_DELAY: 3000,
  /** Delay for nuke animation completion (ms) */
  NUKE_ANIMATION_DELAY: 3000,
  /** Delay before advancing step after action (ms) */
  STEP_ADVANCE_DELAY: 500,
  /** Wait time for nuke animations before clearing lands (ms) */
  NUKE_CLEAR_DELAY: 800,
} as const;

/**
 * Pre-computed location values for performance
 * These are derived from TUTORIAL_COORDS and used for fast lookups
 */
export function computeTutorialLocationValue(coords: {
  x: number;
  y: number;
}): number {
  return coords.y * 256 + coords.x;
}

/** Player's land location as a single number (128 * 256 + 128 = 32896) */
export const PLAYER_LAND_LOCATION = computeTutorialLocationValue(
  TUTORIAL_COORDS.CENTER,
);

/** Neighbor land location as a single number */
export const NEIGHBOR_LAND_LOCATION = computeTutorialLocationValue(
  TUTORIAL_COORDS.NEIGHBOR_TO_NUKE,
);
