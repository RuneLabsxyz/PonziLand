import { ConfigStore } from '$lib/api/config.svelte';
import type { Config } from '$lib/models.gen';
import type { Client } from '$lib/contexts/client.svelte';
import { addAddressPadding } from 'starknet';

const configStoreInstance = new ConfigStore();

// Reactive config values - initialized with defaults, updated from smart contract
export let configValues = $state({
  gameSpeed: 5,
  taxRate: 2,
  baseTime: 3600,
  maxCircles: 10,
  maxAuctions: 16,
  auctionDuration: 7 * 24 * 60 * 60,
  levelUpTime: 3600 * 48, // baseTime * 48
  feeContract: null as string | null,
});

// Function to update all config values - only mutate properties, don't reassign
function updateConfigValues(newConfig: Config) {
  configValues.gameSpeed = Number(newConfig.time_speed);
  configValues.taxRate = Number(newConfig.tax_rate);
  configValues.baseTime = Number(newConfig.base_time);
  configValues.maxCircles = Number(newConfig.max_circles);
  configValues.maxAuctions = Number(newConfig.max_auctions);
  configValues.auctionDuration = Number(newConfig.auction_duration);
  configValues.levelUpTime = configValues.baseTime * 48;
  configValues.feeContract = addAddressPadding(newConfig.our_contract_for_fee);
}

// Setup function
export async function setupConfigStore(client: Client) {
  await configStoreInstance.setup(client);
}

// Initialize subscription when module loads
if (typeof window !== 'undefined') {
  configStoreInstance.getConfig().subscribe((value: Config | undefined) => {
    if (value) {
      updateConfigValues(value);
      console.log('🔧 Config updated:', value);
    }
  });
}
