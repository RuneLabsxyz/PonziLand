import { PUBLIC_ENABLE_BRIDGE } from '$env/static/public';

export const FUSE_DISABLE_SOCIALINK = false;

export const ENABLE_TOKEN_DROP = false;

export const ENABLE_GUILD = false;

export const ENABLE_LEADERBOARD = true;

export const ENABLE_BRIDGE = PUBLIC_ENABLE_BRIDGE === 'true';

/**
 * The maximum amount (in the base currency, so STRK), that can be staked inside of a land.
 * If set to 0, no maximum.
 */
export const MAX_STAKE = 2000n; // Around 250$

/**
 * Due to an issue with controller and the gateway, if a transaction
 * is too big, it gets silantly dropped, without any way of recovering it.
 * With our current gas estimates, we should not be over 3 lands per TX
 * to avoid issues.
 */
export const MAX_CLAIM_ALL_COUNT = 3;

/**
 * Enables the tutorial for new players.
 * The tutorial has been reworked with:
 * - Camera lock and zoom control
 * - Consolidated steps (10 instead of 21)
 * - Interactive hover exploration
 * - Subtle gold glow highlights
 * - Greyed out UI elements
 */
export const ENABLE_TUTORIAL = true;
