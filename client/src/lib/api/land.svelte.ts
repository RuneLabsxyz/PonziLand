import { useClient } from "$lib/contexts/client";
import { onMount, unmount } from "svelte";
import type { BigNumberish } from "starknet";
import type { Land, SchemaType as PonziLandSchemaType } from "$lib/models.gen";
import { useDojo } from "$lib/contexts/dojo";
import {
  createDojoStore,
  QueryBuilder,
  type SubscribeParams,
} from "@dojoengine/sdk";
import { derived, get, readable, writable, type Readable } from "svelte/store";
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
  auctionLand(
    location: BigNumberish,
    startPrice: BigNumberish,
    floorPrice: BigNumberish,
    tokenForSale: string
  ): TransactionResult;
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
    const query = new QueryBuilder<PonziLandSchemaType>()
      .namespace("ponzi_land", (ns) => {
        ns.entity("Land", (e) => e.build());
      })
      .build();
    // also query initial
    await sdk.getEntities({
      query,
      callback: (response) => {
        if (response.error || response.data == null) {
          console.log("Got an error!", response.error);
        } else {
          console.log("Setting entities :)");
          console.log("Data!", JSON.stringify(response.data));
          get(landStore).setEntities(response.data);
        }
      },
    });
    await sdk.subscribeEntityQuery({
      query,
      callback: (response) => {
        if (response.error || response.data == null) {
          console.log("Got an error!", response.error);
        } else {
          console.log("Setting entities :)");
          console.log("Data!", JSON.stringify(response.data));
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
            account.getAccount()!,
            land.location,
            land.token_used,
            amount
          );
        },
        increasePrice(amount: BigNumberish) {
          return sdk.client.actions.increasePrice(
            account.getAccount()!,
            land.location,
            amount
          );
        },
        claim() {
          return sdk.client.actions.claim(account.getAccount()!, land.location);
        },
        nuke() {
          return sdk.client.actions.claim(account.getAccount()!, land.location);
        },
      }));
  });

  return {
    ...landEntityStore,
    buyLand(location, setup) {
      return sdk.client.actions.buy(
        account.getAccount()!,
        location,
        setup.tokenForSaleAddress,
        setup.salePrice,
        setup.amountToStake,
        setup.liquidityPoolAddress
      );
    },
    bidLand(location, setup) {
      return sdk.client.actions.bid(
        account.getAccount()!,
        location,
        setup.tokenForSaleAddress,
        setup.salePrice,
        setup.amountToStake,
        setup.liquidityPoolAddress
      );
    },
    auctionLand(location, startPrice, floorPrice, tokenForSale) {
      return sdk.client.actions.auction(
        account.getAccount()!,
        location,
        startPrice,
        floorPrice,
        tokenForSale
      );
    },
  };
}
