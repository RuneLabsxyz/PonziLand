export const ENABLE_RAMP = false;

export const FUSE_DISABLE_SOCIALINK = true;

export const ENABLE_TOKEN_DROP = false;

export const ENABLE_GUILD = false;

export const ENABLE_LEADERBOARD = false;

/**
 * The maximum amount (in the base currency, so STRK), that can be staked inside of a land.
 * If set to 0, no maximum.
 */
export const MAX_STAKE = 380n; // Around 50$

/**
 * Due to an issue with controller and the gateway, if a transaction
 * is too big, it gets silantly dropped, without any way of recovering it.
 * With our current gas estimates, we should not be over 3 lands per TX
 * to avoid issues.
 */
export const MAX_CLAIM_ALL_COUNT = 3;
