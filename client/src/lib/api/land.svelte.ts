import { useDojo } from '$lib/contexts/dojo';
import type { Land, SchemaType as PonziLandSchemaType } from '$lib/models.gen';
import { getTokenInfo, toBigInt, toHexWithPadding } from '$lib/utils';
import { QueryBuilder, type SubscribeParams } from '@dojoengine/sdk';
import type { BigNumberish, Result } from 'starknet';
import { derived, get, writable, type Readable } from 'svelte/store';

export type TransactionResult = Promise<
  | {
      transaction_hash: string;
    }
  | undefined
>;

export type LandSetup = {
  tokenForSaleAddress: string;
  salePrice: BigNumberish;
  amountToStake: BigNumberish;
  liquidityPoolAddress: string;
  tokenAddress: string;
  currentPrice: BigNumberish;
};

export type LandsStore = Readable<LandWithActions[]> & {
  /// Buy a land from another player
  buyLand(location: BigNumberish, setup: LandSetup): TransactionResult;
  /// Buy an empty / nuked land.
  /// NOTE: This function may be removed later.
  bidLand(location: BigNumberish, setup: LandSetup): TransactionResult;
  auctionLand(
    location: BigNumberish,
    startPrice: BigNumberish,
    floorPrice: BigNumberish,
    tokenForSale: string,
    decayRate: BigNumberish,
  ): TransactionResult;
  getPendingTaxes(owner: string): Promise<Result | undefined>;
  getPendingTaxesForLand(location: BigNumberish): Promise<Result | undefined>;
};

export type LandWithMeta = Land & {
  type: 'auction' | 'house' | 'grass' | string;
  owner: string;
  sellPrice: number | null;
  tokenUsed: string | null;
  tokenAddress: string | null;
};

export type LandWithActions = LandWithMeta & {
  increaseStake(amount: BigNumberish): TransactionResult;
  increasePrice(amount: BigNumberish): TransactionResult;
  claim(): TransactionResult;
  nuke(): TransactionResult;
  getPendingTaxes(): Promise<Result | undefined>;
  getNextClaim(): Promise<Result | undefined>;
  getCurrentAuctionPrice(): Promise<Result | undefined>;
};

export function useLands(): LandsStore | undefined {
  // Get all lands in the store
  if (typeof window === 'undefined') {
    // We are on the server. Return nothing.
    return undefined;
  }

  const { store, client: sdk, accountManager } = useDojo();

  const landStore = derived([store], ([actualStore]) => actualStore);

  // We are using this to ensure that we are getting the latest provider, not an old one.
  const account = () => {
    return accountManager.getProvider();
  };

  (async () => {
    const query = new QueryBuilder<PonziLandSchemaType>()
      .namespace('ponzi_land', (ns) => {
        ns.entity('Land', (e) => e.build());
      })
      .build();
    // also query initial
    await sdk.getEntities({
      query,
      callback: (response) => {
        if (response.error || response.data == null) {
          console.log('Got an error!', response.error);
        } else {
          console.log('Setting entities :)');
          console.log('Data!', response.data);
          get(landStore).setEntities(response.data);
        }
      },
    });
    await sdk.subscribeEntityQuery({
      query,
      callback: (response) => {
        if (response.error || response.data == null) {
          console.log('Got an error!', response.error);
        } else {
          console.log('Setting entities :)');
          console.log('Data!', JSON.stringify(response.data));
          get(landStore).setEntities(response.data);
        }
      },
      options: {},
    } as SubscribeParams<PonziLandSchemaType>);
  })();

  const landEntityStore = derived([landStore], ([s]) => {
    return s
      .getEntitiesByModel('ponzi_land', 'Land')
      .map((e) => e.models['ponzi_land']['Land'] as Land)
      .map((land) => {
        // ------------------------
        // Land With Meta data here
        // ------------------------

        // convert sell price to number
        let sellPrice;
        if (typeof land.sell_price === 'string') {
          sellPrice = parseInt(land.sell_price);
        } else if (typeof land.sell_price === 'bigint') {
          sellPrice = Number(land.sell_price);
        } else {
          sellPrice = land.sell_price;
        }

        return {
          ...land,
          type: land.owner == toHexWithPadding(0) ? 'auction' : 'house',
          owner: land.owner,
          sellPrice: sellPrice,
          tokenUsed: getTokenInfo(land.token_used)?.name ?? 'Unknown Token',
          tokenAddress: land.token_used,
          stakeAmount: toBigInt(land.stake_amount),
        };
      })
      .map((land) => ({
        ...land,
        // Add functions
        increaseStake(amount: BigNumberish) {
          return sdk.client.actions.increaseStake(
            account()?.getWalletAccount()!,
            land.location,
            land.token_used,
            amount,
          );
        },
        increasePrice(amount: BigNumberish) {
          return sdk.client.actions.increasePrice(
            account()?.getWalletAccount()!,
            land.location,
            amount,
          );
        },
        claim() {
          return sdk.client.actions.claim(
            account()?.getAccount()!,
            land.location,
          );
        },
        nuke() {
          return sdk.client.actions.claim(
            account()?.getAccount()!,
            land.location,
          );
        },
        getPendingTaxes() {
          return sdk.client.actions.getPendingTaxesForLand(
            land.location,
            account()!.getAccount()!.address,
          );
        },
        getNextClaim() {
          return sdk.client.actions.getNextClaimInfo(land.location);
        },
        getCurrentAuctionPrice() {
          return sdk.client.actions.getCurrentAuctionPrice(land.location);
        },
      }));
  });

  return {
    ...landEntityStore,
    buyLand(location, setup) {
      return sdk.client.actions.buy(
        account()?.getWalletAccount()!,
        location,
        setup.tokenForSaleAddress,
        setup.salePrice,
        setup.amountToStake,
        setup.liquidityPoolAddress,
        setup.tokenAddress,
        setup.currentPrice,
      );
    },

    // TODO(#53): Split this action in two, and migrate the call to the session account
    bidLand(location, setup) {
      return sdk.client.actions.bid(
        account()?.getWalletAccount()!,
        location,
        setup.tokenForSaleAddress,
        setup.salePrice,
        setup.amountToStake,
        setup.liquidityPoolAddress,
        setup.tokenAddress,
        setup.currentPrice,
      );
    },
    auctionLand(location, startPrice, floorPrice, tokenForSale, decayRate) {
      return sdk.client.actions.auction(
        account()?.getWalletAccount()!,
        location,
        startPrice,
        floorPrice,
        tokenForSale,
        decayRate,
      );
    },
    getPendingTaxes() {
      return sdk.client.actions.getPendingTaxes(
        account()!.getAccount()!.address,
      );
    },
    getPendingTaxesForLand(location) {
      return sdk.client.actions.getPendingTaxesForLand(
        location,
        account()!.getAccount()!.address,
      );
    },
  };
}

// an array of nukable locations
export const nukableStore = writable<bigint[]>([]);