import { toHexWithPadding } from '$lib/utils';
import { derived, writable } from 'svelte/store';
import data from '$lib/data.json';
import type { AuctionData, TileInfo } from '$lib/interfaces';
import type { TransactionResult } from '$lib/api/land.svelte';

export const selectedLand = writable<{
  location: number;
  owner: string | null;
  sellPrice: number;
  tokenUsed: string;
  tokenAddress: string;
  claim(): TransactionResult;
  nuke(): TransactionResult;
} | null>(null);

export const selectedLandMeta = derived(selectedLand, ($selectedLand) => {
  if ($selectedLand) {
    // --- Derived Props ---

    // check if land is in auction
    const isAuction = $selectedLand.owner === toHexWithPadding(0);

    // get token info from tokenAddress from data
    const token = data.availableTokens.find(
      (token) => token.address === $selectedLand.tokenAddress,
    );

    // --- Helper Functions --- TODO

    return {
      ...$selectedLand,
      isAuction,
      token,
    };
  }
  return null;
});

export const mousePosCoords = writable<{
  x: number;
  y: number;
} | null>(null);

export const accountAddress = writable<string | null>(null);

// UI State

export let uiStore = $state<{
  showModal: boolean;
  modalData: TileInfo | null;
  auctionData: AuctionData | null;
}>({
  showModal: false,
  modalData: null,
  auctionData: null,
});
