// Shared constants with the contracts
export const GAME_SPEED = 20;
export const GRID_SIZE = 64;
export const TAX_RATE = 2; // as a percentage

export const DATE_GATE: Date | undefined = new Date('2025-04-24T16:30:00Z');
export const CLOSING_DATE: Date | undefined = new Date('2025-05-01T00:00:00Z');

/**
 * Time to level up a buildings, in seconds.
 */
export const LEVEL_UP_TIME = 60 * 60 * 48;
export const TILE_SIZE = 32;

export const MIN_SCALE_FOR_DETAIL = 2.5;

export const NAME_SPACE = 'ponzi_land';

import data from '$profileData';

export const AI_AGENT_ADDRESSES = data.aiAgents.map((agent) => agent.address);
