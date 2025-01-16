import { padAddress, toHexWithPadding } from '$lib/utils';
import { derived, writable } from 'svelte/store';
import data from '$lib/data.json';
import type { AuctionData, TileInfo } from '$lib/interfaces';
import type { TransactionResult } from '$lib/api/land.svelte';
import type { Result } from 'starknet';

export type SelectedLandType = {
  type: string;
  location: string;
  owner: string | null;
  sellPrice: number | null;
  tokenUsed: string | null;
  tokenAddress: string | null;
  stakeAmount: number | null;
  claim(): TransactionResult;
  nuke(): TransactionResult;
  getPendingTaxes(): Promise<
    | {
        amount: bigint;
        token_address: bigint;
      }[]
    | undefined
  >;
  getNextClaim(): Promise<
    | {
        amount: bigint;
        token_address: bigint;
        land_location: bigint;
        can_be_nuked: boolean;
      }[]
    | undefined
  >;
} | null;

export const selectedLand = writable<SelectedLandType>(null);

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
      isEmpty: $selectedLand.owner == undefined,
      token,
    };
  }
  return null;
});

export const mousePosCoords = writable<{
  x: number;
  y: number;
  location: number;
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
