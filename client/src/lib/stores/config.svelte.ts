import { ConfigStore } from '$lib/api/config.svelte';
import type { Client } from '$lib/contexts/client.svelte';
import type { BigNumberish } from 'starknet';

const configStore = new ConfigStore();

// Reactive config values - initialized with defaults, updated from smart contract

function getOrDefault(
  value: BigNumberish | undefined,
  defaultValue: number,
): number {
  return value != undefined ? Number(value) : defaultValue;
}

export const configValues = $derived({
  gameSpeed: getOrDefault(configStore.config?.time_speed, 5),
  taxRate: getOrDefault(configStore.config?.tax_rate, 2),
  baseTime: getOrDefault(configStore.config?.base_time, 3600),
  maxCircles: getOrDefault(configStore.config?.max_circles, 10),
  maxAuctions: getOrDefault(configStore.config?.max_auctions, 16),
  auctionDuration: getOrDefault(
    configStore.config?.auction_duration,
    7 * 24 * 60 * 60,
  ),
  levelUpTime: getOrDefault(configStore.config?.base_time, 3600) * 48,
});

// Setup function
export async function setupConfigStore(client: Client) {
  await configStore.setup(client);
}
