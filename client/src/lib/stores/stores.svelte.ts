import type { TransactionResult } from '$lib/api/land.svelte';
import data from '$lib/data.json';
import type { TileInfo } from '$lib/interfaces';
import { toHexWithPadding } from '$lib/utils';
import { derived, writable } from 'svelte/store';
import type { YieldInfo } from '$lib/interfaces';

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
  getCurrentAuctionPrice(): Promise<bigint | undefined>;
  increaseStake(amount: bigint): Promise<
    | {
        transaction_hash: string;
      }
    | undefined
  >;
  getYieldInfo(): Promise<YieldInfo[] | undefined>;
} | null;

export const selectedLand = writable<SelectedLandType>(null);

export const selectedLandMeta = derived(selectedLand, ($selectedLand) => {
  if ($selectedLand) {
    // --- Derived Props ---

    // check if land is in auction
    const isAuction = $selectedLand.owner === toHexWithPadding(0);

    // get yield info
    const yieldInfo = $selectedLand.getYieldInfo();

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
      yieldInfo,
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
  modalType: 'bid' | 'buy' | 'land-info' | null;
  modalData: TileInfo | null;
}>({
  showModal: false,
  modalType: null,
  modalData: null,
});
