import { useLands, type LandWithActions } from '$lib/api/land.svelte';
import { useAccount } from '$lib/contexts/account.svelte';
import data from '$lib/data.json';
import type { TileInfo, Token } from '$lib/interfaces';
import { toHexWithPadding } from '$lib/utils';
import { derived, readable, writable, type Readable } from 'svelte/store';
import account from '$lib/account.svelte';

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

export const accountAddress = readable<string | undefined>(
  undefined,
  (set, update) => {
    const account = useAccount();

    set(account!.getProvider()?.getAccount()?.address);

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

export function usePlayerLands() {
  const landsStore = useLands();

  return derived([landsStore!], ([$landsStore]) => {
    const accountAddress = account.address;
    if (!$landsStore || !accountAddress) {
      console.log('No value in store!');
      return [];
    }
    const address = accountAddress;
    return $landsStore.filter((land) => land.owner == address);
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