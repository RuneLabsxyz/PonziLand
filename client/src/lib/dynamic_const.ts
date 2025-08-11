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

import { derived } from 'svelte/store';
import { configStore } from './stores/store.svelte';

// Get reactive config store
const config = configStore.getConfig();

// Create derived stores for each config value
// These are reactive - components re-render when values change

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
