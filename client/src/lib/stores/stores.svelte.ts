import account from '$lib/account.svelte';
import { useLands, type LandWithActions } from '$lib/api/land.svelte';
import data from '$profileData';
import type { Token } from '$lib/interfaces';
import { padAddress } from '$lib/utils';
import { derived, writable, type Readable } from 'svelte/store';

export const selectedLandPosition = writable<string | null>(null);

export const selectedLand: Readable<LandWithActions | undefined> = derived(
  selectedLandPosition,
  ($pos, set) => {
    // We only call useLands() once there’s an active subscription on selectedLand.
    let unsubscribe: (() => void) | undefined;

    if ($pos) {
      // “Lazily” set up the subscription
      const landsStore = useLands()!;

      unsubscribe = landsStore.subscribe((lands) => {
        if (!lands) {
          set(undefined);
        } else {
          set(lands.find((land) => land.location === $pos));
        }
      });
    } else {
      // No position => no land
      set(undefined);
    }

    return () => {
      // Called on cleanup when no more subscribers
      unsubscribe?.();
    };
  },
);

export function selectLand(land: LandWithActions) {
  selectedLandPosition.set(land.location);
}

export type LandWithToken = LandWithActions & {
  token?: Token;
};

export type SelectedLand = LandWithToken | undefined;

export const selectedLandMeta: Readable<SelectedLand> = derived(
  selectedLand,
  ($selectedLand) => {
    if ($selectedLand) {
      if ($selectedLand?.owner == undefined) {
        return {
          ...$selectedLand,
          isEmpty: true,
        };
      }
      // --- Derived Props ---

      // get token info from tokenAddress from data
      const token = data.availableTokens.find(
        (token) => token.address === $selectedLand!.tokenAddress,
      );

      // --- Helper Functions --- TODO

      return {
        ...$selectedLand,
        isEmpty: false,
        token,
      };
    }
    return undefined;
  },
);

export const mousePosCoords = writable<{
  x: number;
  y: number;
  location: number;
} | null>(null);

export function usePlayerLands() {
  const landsStore = useLands();

  return derived([landsStore!], ([$landsStore]) => {
    const accountAddress = account.address;
    if (!$landsStore || !accountAddress) {
      console.log('No value in store!');
      return [];
    }
    const address = padAddress(accountAddress); // here to prevent controller address removing zeros from the start
    const lands = $landsStore.filter((land) => land.owner == address);
    return lands;
  });
}

export function useActiveAuctions() {
  let landsStore = useLands();

  console.log('landsStore', landsStore);

  return derived(landsStore!, ($landsStore) => {
    console.log('derived', $landsStore);
    if (!landsStore) {
      console.log('No value in store!');
      return [];
    }
    return $landsStore.filter((land) => land.type == 'auction');
  });
}
