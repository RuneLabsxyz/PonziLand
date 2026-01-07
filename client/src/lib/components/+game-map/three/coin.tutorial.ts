/**
 * Tutorial-specific logic for coin.svelte
 * Extracted to keep the main component focused on rendering.
 */

import {
  TUTORIAL_COORDS,
  TUTORIAL_TIMING,
  PLAYER_LAND_LOCATION,
} from '$lib/components/tutorial/constants';
import { coordinatesToLocation } from '$lib/utils';

/**
 * Tutorial location constants (re-exported for backward compatibility)
 */
export const TUTORIAL_COIN_CONFIG = {
  PLAYER_LAND_LOCATION: PLAYER_LAND_LOCATION,
  NEIGHBOR_LAND: TUTORIAL_COORDS.NEIGHBOR_TO_NUKE,
  NUKE_ANIMATION_DELAY_MS: TUTORIAL_TIMING.NUKE_ANIMATION_DELAY,
  STEP_ADVANCE_DELAY_MS: TUTORIAL_TIMING.STEP_ADVANCE_DELAY,
} as const;

/**
 * Get the neighbor land location for tutorial nuke animation
 */
export function getTutorialNeighborLocation(): number {
  return coordinatesToLocation(TUTORIAL_COIN_CONFIG.NEIGHBOR_LAND);
}

/**
 * Check if the coin should be visible during the tutorial claim step
 */
export function shouldShowTutorialCoin(
  tutorialEnabled: boolean,
  hasWaitClaimNuke: boolean,
  tileLocation: number,
): boolean {
  if (!tutorialEnabled || !hasWaitClaimNuke) {
    return false;
  }
  return tileLocation === TUTORIAL_COIN_CONFIG.PLAYER_LAND_LOCATION;
}

/**
 * Check if this is the tutorial claim step on the player's land
 */
export function isTutorialClaimTile(
  tutorialEnabled: boolean,
  hasWaitClaimNuke: boolean,
  tileLocation: number,
): boolean {
  return (
    tutorialEnabled &&
    hasWaitClaimNuke &&
    tileLocation === TUTORIAL_COIN_CONFIG.PLAYER_LAND_LOCATION
  );
}
