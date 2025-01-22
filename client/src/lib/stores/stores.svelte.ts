import type {
  LandWithActions,
  LandWithMeta,
  TransactionResult,
} from '$lib/api/land.svelte';
import data from '$lib/data.json';
import type { TileInfo, Token } from '$lib/interfaces';
import { toHexWithPadding } from '$lib/utils';
import { derived, writable, type Readable } from 'svelte/store';
import type { YieldInfo } from '$lib/interfaces';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

export const selectedLand = writable<LandWithActions | undefined>();

export function selectLand(land: LandWithActions) {
  selectedLand.set(land);
}

export const selectedLandMeta: Readable<
  | (LandWithActions & {
      token?: Token;
    })
  | undefined
> = derived(selectedLand, ($selectedLand) => {
  if ($selectedLand) {
    if ($selectedLand.owner == undefined) {
      return {
        ...$selectedLand,
        isEmpty: true,
      };
    }
    // --- Derived Props ---

    // get token info from tokenAddress from data
    const token = data.availableTokens.find(
      (token) => token.address === $selectedLand.tokenAddress,
    );

    // --- Helper Functions --- TODO

    return {
      ...$selectedLand,
      isEmpty: false,
      token,
    };
  }
  return undefined;
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
