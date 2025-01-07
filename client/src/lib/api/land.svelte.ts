import { useClient } from "$lib/contexts/client";
import { onMount, unmount } from "svelte";
import type { BigNumberish } from "starknet";
import type { Land, PonziLandSchemaType } from "$lib/models.gen";
import { useDojo } from "$lib/contexts/dojo";
import {
  createDojoStore,
  QueryBuilder,
  type SubscribeParams,
} from "@dojoengine/sdk";
import { derived, get, writable, type Readable } from "svelte/store";
import { slide } from "svelte/transition";

type TransactionResult = Promise<
  | {
      transaction_hash: string;
    }
  | undefined
>;

type LandSetup = {
  tokenForSaleAddress: string;
  salePrice: BigNumberish;
  amountToStake: BigNumberish;
  liquidityPoolAddress: string;
};

type LandsStore = Readable<LandWithActions[]> & {
  /// Buy a land from another player
  buyLand(location: BigNumberish, setup: LandSetup): TransactionResult;
  /// Buy an empty / nuked land.
  /// NOTE: This function may be removed later.
  bidLand(location: BigNumberish, setup: LandSetup): TransactionResult;
};

type LandWithActions = Land & {
  increaseStake(amount: BigNumberish): TransactionResult;
  increasePrice(amount: BigNumberish): TransactionResult;
  claim(): TransactionResult;
};

export function useLands(): LandsStore | undefined {
  // Get all lands in the store
  if (typeof window === "undefined") {
    // We are on the server. Return nothing.
    return undefined;
  }

  const { store, client: sdk, account } = useDojo();

  const landStore = derived([store], ([actualStore]) => actualStore);

  (async () => {
    await sdk.subscribeEntityQuery({
      query: new QueryBuilder<PonziLandSchemaType>()
        .namespace("ponzi_land", (ns) => {
          ns.entity("Land", (e) => e.build());
        })
        .build(),
      callback: (response) => {
        if (response.error || response.data == null) {
          console.log("Got an error!", response.error);
        } else {
          console.log("Setting entities :)");
          console.log("Data!");
          get(landStore).setEntities(response.data);
        }
      },
      options: {},
    } as SubscribeParams<PonziLandSchemaType>);
  })();

  const landEntityStore = derived([landStore], ([s]) => {
    return s
      .getEntitiesByModel("ponzi_land", "Land")
      .map((e) => e.models["ponzi_land"]["Land"] as Land)
      .map((land) => ({
        ...land,
        // Add functions
        increaseStake(amount: BigNumberish) {
          return sdk.client.actions.increaseStake(
            account.account!,
            land.location,
            amount
          );
        },
        increasePrice(amount: BigNumberish) {
          return sdk.client.actions.increasePrice(
            account.account!,
            land.location,
            amount
          );
        },
        claim() {
          return sdk.client.actions.claim(account.account!, land.location);
        },
        nuke() {
          return sdk.client.actions.claim(account.account!, land.location);
        },
      }));
  });

  return {
    ...landEntityStore,
    buyLand(location, setup) {
      return sdk.client.actions.buy(
        account.account!,
        location,
        setup.tokenForSaleAddress,
        setup.salePrice,
        setup.amountToStake,
        setup.liquidityPoolAddress
      );
    },
    bidLand(location, setup) {
      return sdk.client.actions.bid(
        account.account!,
        location,
        setup.tokenForSaleAddress,
        setup.salePrice,
        setup.amountToStake,
        setup.liquidityPoolAddress
      );
    },
  };
}
