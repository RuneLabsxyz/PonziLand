import {
  useLands,
  type LandWithActions,
  type LandWithMeta,
  type TransactionResult,
} from '$lib/api/land.svelte';
import data from '$lib/data.json';
import type { TileInfo, Token } from '$lib/interfaces';
import { toHexWithPadding } from '$lib/utils';
import { derived, readable, writable, type Readable } from 'svelte/store';
import type { YieldInfo } from '$lib/interfaces';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { useAccount } from '$lib/contexts/account';

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

export const accountAddress = readable<string | undefined>(
  undefined,
  (set, update) => {
    const account = useAccount();

    set(account.getProvider()?.getAccount()?.address);

    // Handle unsubscribe
    return account!.listen((event) => {
      if (event.type === 'connected') {
        set(event.provider.getAccount()?.address);
      } else if (event.type === 'disconnected') {
        set(undefined);
      }
    });
  },
);

export function usePlayerPlands() {
  const landsStore = useLands();

  return derived(
    [landsStore!, accountAddress],
    ([$landsStore, $accountAddress]) => {
      if (!$landsStore || !$accountAddress) {
        console.log('No value in store!');
        return [];
      }
      const accountAddress = toHexWithPadding(BigInt($accountAddress));
      return $landsStore.filter(
        (land) => toHexWithPadding(BigInt(land.owner)) == accountAddress,
      );
    },
  );
}

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
