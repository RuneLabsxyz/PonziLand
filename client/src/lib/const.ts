import data from '$profileData';
import { configStore } from '$lib/stores/store.svelte';
import { derived } from 'svelte/store';

/**
 * DYNAMIC CONFIGURATION CONSTANTS
 * ================================
 * These values come from the Config model via subscription.
 * They update automatically when config changes in the smart contract.
 *
 * Usage Patterns:
 * - In Svelte components: $GRID_SIZE (reactive - auto re-renders)
 * - In regular functions: get(GRID_SIZE) (one-time value access)
 * - In reactive statements: $: something = $GRID_SIZE * 2
 */

// Get reactive config store
const config = configStore.getConfig();

// Create derived stores for each config value
// These are reactive - components re-render when values change

//TODO: to regulate the size of the map we have to use the MAX_CIRCLE CONST
export const GRID_SIZE = 255;

export const GAME_SPEED = derived(
  config,
  ($config): number => ($config ? Number($config.time_speed) : 5), // fallback while loading
);

export const TAX_RATE = derived(
  config,
  ($config): number => ($config ? Number($config.tax_rate) : 2), // fallback while loading
);

export const BASE_TIME = derived(
  config,
  ($config): number => ($config ? Number($config.base_time) : 3600), // fallback while loading
);

// Derived from BASE_TIME - level up takes 48 base time units
export const LEVEL_UP_TIME = derived(
  BASE_TIME,
  ($baseTime): number => $baseTime * 48,
);

// Additional config constants
export const CENTER_LOCATION = derived(
  config,
  ($config): number => ($config ? Number($config.center_location) : 32639), // fallback from contracts/consts.cairo
);

export const MAX_AUCTIONS = derived(
  config,
  ($config): number => ($config ? Number($config.max_auctions) : 16), // fallback from contracts/consts.cairo
);

export const AUCTION_DURATION = derived(
  config,
  ($config): number =>
    $config ? Number($config.auction_duration) : 7 * 24 * 60 * 60, // fallback: 1 week
);

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
export const AI_AGENT_ADDRESSES = data.aiAgents.map((agent) => agent.address);
