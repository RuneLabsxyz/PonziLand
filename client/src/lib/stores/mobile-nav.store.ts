import { writable } from 'svelte/store';
import type { BaseLand } from '$lib/api/land';
import type { AuctionLand } from '$lib/api/land/auction_land';
import type { BuildingLand } from '$lib/api/land/building_land';

export type MobileTab = 'map' | 'command-center' | 'wallet' | 'market';

export const activeTab = writable<MobileTab>('map');

// Store for selected land data on mobile
export const mobileLandSelection = writable<AuctionLand | BuildingLand | null>(
  null,
);

// Store for market widget state - 'market' shows market list, 'land-details' shows specific land
export const marketViewState = writable<'market' | 'land-details'>('market');

// Helper function to open land details in market tab
export function openMobileLandDetails(land: AuctionLand | BuildingLand) {
  mobileLandSelection.set(land);
  marketViewState.set('land-details');
  activeTab.set('market');
}

// Helper function to go back to market view
export function backToMarket() {
  marketViewState.set('market');
  mobileLandSelection.set(null);
}
