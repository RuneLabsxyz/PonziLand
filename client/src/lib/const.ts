import data from '$profileData';

// Coordinate system constants (matching contracts/src/helpers/coord.cairo)
export const COORD_MULTIPLIER = 256; // TWO_POW_8 from contracts
export const COORD_MASK = 0xff; // MASK_8 from contracts

// Tournament dates
export const DATE_GATE: Date | undefined = new Date('2025-06-02T22:30:00Z');
export const CLOSING_DATE: Date | undefined = new Date('2025-06-16T20:00:00Z');

// UI constants
export const TILE_SIZE = 256;
export const MIN_SCALE_FOR_DETAIL = 0.35;
export const MIN_SCALE_FOR_ANIMATION = 0.35;
export const DEFAULT_TIMEOUT = 30000; // Default timeout for waiting operations
export const WIDGETS_STORAGE_KEY = 'ponziland-widgets-state';

// Environment constants
export const NAME_SPACE = 'ponzi_land';
export const AI_AGENT_ADDRESSES = data.aiAgents.map(
  (agent) => (agent as any).address,
);

//TODO: to regulate the size of the map we have to use the MAX_CIRCLE CONST
export const GRID_SIZE = 256;

// Referral system constants
export const REFERRAL_COOKIE_NAME = 'ponziland_referral';
export const REFERRAL_CODE_REGEX = /^[A-Z0-9]{6}$/i;
