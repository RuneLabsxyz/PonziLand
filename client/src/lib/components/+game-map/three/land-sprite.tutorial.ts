/**
 * Tutorial-specific logic for land-sprite.svelte
 * Extracted to keep the main component focused on rendering.
 */

import type { LandTile } from './landTile';
import type { BaseLand } from '$lib/api/land';
import { coordinatesToLocation, locationToCoordinates } from '$lib/utils';
import { TUTORIAL_COORDS } from '$lib/components/tutorial/constants';

/**
 * Tutorial tile location constants (re-exported for backward compatibility)
 */
export const TUTORIAL_LOCATIONS = {
  CENTER: TUTORIAL_COORDS.CENTER,
  SECOND_AUCTION: TUTORIAL_COORDS.SECOND_AUCTION,
  FULL_AUCTION: TUTORIAL_COORDS.FULL_AUCTION,
} as const;

/**
 * Tutorial phase identifiers for auction highlighting
 */
export type TutorialPhase = 'phase_1' | 'phase_2' | 'phase_5' | 'default';

/**
 * Get the target coordinates for tutorial auction highlight based on current phase
 */
export function getTutorialAuctionTarget(
  hasPhase1: boolean,
  hasPhase2: boolean,
  hasPhase5: boolean,
): { x: number; y: number } {
  if (hasPhase1) {
    return TUTORIAL_LOCATIONS.CENTER;
  } else if (hasPhase2) {
    return TUTORIAL_LOCATIONS.SECOND_AUCTION;
  } else if (hasPhase5) {
    return TUTORIAL_LOCATIONS.FULL_AUCTION;
  }
  // Default fallback
  return TUTORIAL_LOCATIONS.SECOND_AUCTION;
}

/**
 * Determine the target coordinates for the black square highlight tile
 * based on tutorial attributes.
 *
 * @returns The target coordinates or undefined if no highlight should be shown
 */
export function getBlackSquareTarget(
  hasHighlightBuilding: boolean,
  hasHighlightAuction: boolean,
  hasPhase1: boolean,
  hasPhase2: boolean,
  hasPhase5: boolean,
): { x: number; y: number } | undefined {
  if (hasHighlightBuilding) {
    return TUTORIAL_LOCATIONS.CENTER;
  } else if (hasHighlightAuction) {
    return getTutorialAuctionTarget(hasPhase1, hasPhase2, hasPhase5);
  }
  return undefined;
}

/**
 * Check if the black square highlight should be hidden because
 * the buy/info button should be highlighted instead.
 */
export function shouldHideBlackSquareForButton(
  hasHighlightMapBuy: boolean,
  hasHighlightInfoButton: boolean,
  selectedLand: { location: string } | null | undefined,
  targetX: number,
  targetY: number,
): boolean {
  if ((hasHighlightMapBuy || hasHighlightInfoButton) && selectedLand) {
    const coords = locationToCoordinates(selectedLand.location);
    return coords.x === targetX && coords.y === targetY;
  }
  return false;
}

/**
 * Find the tutorial land tile at the center position (128, 128)
 * Used during the tutorial claim step to show the player's coin.
 */
export function findTutorialClaimLand(
  visibleLandTiles: LandTile[],
  isBuilding: (land: BaseLand) => boolean,
): LandTile | undefined {
  return visibleLandTiles.find(
    (tile) =>
      isBuilding(tile.land) &&
      coordinatesToLocation(tile.land.location) ===
        coordinatesToLocation(TUTORIAL_LOCATIONS.CENTER),
  );
}

/**
 * Check if the buy widget should be blocked during tutorial
 */
export function isBuyWidgetBlocked(
  tutorialEnabled: boolean,
  allowBuyWidget: boolean,
): boolean {
  return tutorialEnabled && !allowBuyWidget;
}
