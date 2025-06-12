import data from '$profileData';

// Shared constants with the contracts
export const GAME_SPEED = 5;
export const GRID_SIZE = 64;
export const TAX_RATE = 2; // as a percentage
export const LEVEL_UP_TIME = 60 * 60 * 48;

// Tournament dates
export const DATE_GATE: Date | undefined = new Date('2025-06-02T22:30:00Z');
export const CLOSING_DATE: Date | undefined = undefined;

// UI constants
export const TILE_SIZE = 256;
export const MIN_SCALE_FOR_DETAIL = 0.35;
export const MIN_SCALE_FOR_ANIMATION = 0.35;
export const DEFAULT_TIMEOUT = 30000; // Default timeout for waiting operations

// Environment constants
export const NAME_SPACE = 'ponzi_land';
export const AI_AGENT_ADDRESSES = data.aiAgents.map((agent) => agent.address);
