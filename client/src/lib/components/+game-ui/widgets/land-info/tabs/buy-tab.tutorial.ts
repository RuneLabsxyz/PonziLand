/**
 * Tutorial-specific logic for buy-tab.svelte
 * Extracted to keep the main component focused on form handling.
 */

/**
 * Check if buy button should be blocked during tutorial
 */
export function shouldBlockBuyInTutorial(
  tutorialEnabled: boolean,
  hasWaitBuyLand: boolean,
  hasWaitAuctionBuy: boolean,
): boolean {
  if (!tutorialEnabled) return false;
  return !hasWaitBuyLand && !hasWaitAuctionBuy;
}

/**
 * Check if the purchase action should trigger tutorial step progression
 */
export function shouldAdvanceTutorialOnBuy(
  hasWaitBuyLand: boolean,
  hasWaitAuctionBuy: boolean,
): boolean {
  return hasWaitBuyLand || hasWaitAuctionBuy;
}

/**
 * Check if tutorial mode should block form submission due to advisor warnings
 */
export function shouldBlockForAdvisorWarnings(
  tutorialEnabled: boolean,
  hasAdvisorWarnings: boolean,
): boolean {
  return tutorialEnabled && hasAdvisorWarnings;
}
