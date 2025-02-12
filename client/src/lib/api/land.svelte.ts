import { useDojo } from '$lib/contexts/dojo';
import type { Token, YieldInfo } from '$lib/interfaces';
import type { Land, SchemaType as PonziLandSchemaType } from '$lib/models.gen';
import {
  ensureNumber,
  getNeighbours,
  getTokenInfo,
  toBigInt,
  toHexWithPadding,
} from '$lib/utils';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { QueryBuilder, type SubscribeParams } from '@dojoengine/sdk';
import type { BigNumberish, Result } from 'starknet';
import { derived, get, writable, type Readable } from 'svelte/store';
import data from '$lib/data.json';
import { type LandYieldInfo } from '$lib/interfaces';
import { estimateNukeTime, getNeighbourYieldArray } from '$lib/utils/taxes';
import type { Level as LevelModel } from '$lib/models.gen';
import { fromDojoLevel } from '$lib/utils/level';
export type TransactionResult = Promise<
  | {
      transaction_hash: string;
    }
  | undefined
>;

export type Level = keyof LevelModel;

export type LandSetup = {
  tokenForSaleAddress: string;
  salePrice: CurrencyAmount;
  amountToStake: CurrencyAmount;
  liquidityPoolAddress: string;
  tokenAddress: string;
  currentPrice: CurrencyAmount | null;
};

export type LandsStore = Readable<LandWithActions[]> & {
  /// Buy a land from another player
  buyLand(location: BigNumberish, setup: LandSetup): TransactionResult;
  /// Buy an empty / nuked land.
  /// NOTE: This function may be removed later.
  bidLand(location: BigNumberish, setup: LandSetup): TransactionResult;

  auctionLand(
    location: BigNumberish,
    startPrice: CurrencyAmount,
    floorPrice: CurrencyAmount,
    decayRate: BigNumberish,
  ): TransactionResult;
};

export type LandWithMeta = Omit<Land, 'location' | 'level'> & {
  location: string;
  // Type conversions
  stakeAmount: CurrencyAmount;
  sellPrice: CurrencyAmount;

  type: 'auction' | 'house' | 'grass';
  owner: string;

  level: Level;

  tokenUsed: string | null;
  tokenAddress: string | null;

  token?: Token;
};

export type PendingTax = {
  amount: CurrencyAmount;
  tokenAddress: string;
};

export type NextClaimInformation = {
  amount: CurrencyAmount;
  tokenAddress: string;
  landLocation: string;
  canBeNuked: boolean;
};

export type LandWithActions = LandWithMeta & {
  increaseStake(amount: CurrencyAmount): TransactionResult;
  increasePrice(amount: CurrencyAmount): TransactionResult;
  claim(): TransactionResult;
  nuke(): TransactionResult;
  getPendingTaxes(): Promise<PendingTax[] | undefined>;
  getNextClaim(): Promise<NextClaimInformation[] | undefined>;
  getCurrentAuctionPrice(): Promise<CurrencyAmount | undefined>;
  getYieldInfo(): Promise<LandYieldInfo | undefined>;
  getEstimatedNukeTime(): number | undefined;
  levelUp(): TransactionResult;
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
    const landWithActions: LandWithActions[] = s
      .getEntitiesByModel('ponzi_land', 'Land')
      .map((e) => e.models['ponzi_land']['Land'] as Land)
      .map((land) => {
        // ------------------------
        // Land With Meta data here
        // ------------------------
        //
        const token = data.availableTokens.find(
          (token) => token.address === land.token_used,
        );

        return {
          ...land,
          location: toHexWithPadding(ensureNumber(land.location)),
          type: (land.owner == toHexWithPadding(0) ? 'auction' : 'house') as
            | 'auction'
            | 'house',
          owner: land.owner,
          level: fromDojoLevel(land.level) ?? 'None',
          sellPrice: CurrencyAmount.fromUnscaled(land.sell_price),
          tokenUsed: getTokenInfo(land.token_used)?.name ?? 'Unknown Token',
          tokenAddress: land.token_used,
          stakeAmount: CurrencyAmount.fromUnscaled(land.stake_amount),
          token,
        };
      })
      .map((land) => ({
        ...land,
        // Add functions
        increaseStake(amount: CurrencyAmount) {
          return sdk.client.actions.increaseStake(
            account()?.getWalletAccount()!,
            land.location,
            land.token_used,
            amount.toBignumberish(),
          );
        },
        increasePrice(amount: CurrencyAmount) {
          return sdk.client.actions.increasePrice(
            account()?.getWalletAccount()!,
            land.location,
            amount.toBignumberish(),
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
        async getPendingTaxes() {
          const result = (await sdk.client.actions.getPendingTaxesForLand(
            land.location,
            account()!.getAccount()!.address,
          )) as any[] | undefined;

          return result?.map((tax) => ({
            amount: CurrencyAmount.fromUnscaled(tax.amount),
            tokenAddress: toHexWithPadding(tax.token_address),
          }));
        },
        async getNextClaim() {
          const result = (await sdk.client.actions.getNextClaimInfo(
            ensureNumber(land.location),
          )) as any[] | undefined;
          return result?.map((claim) => ({
            amount: CurrencyAmount.fromUnscaled(claim.amount),
            tokenAddress: toHexWithPadding(claim.token_address),
            landLocation: toHexWithPadding(claim.land_location),
            canBeNuked: claim.can_be_nuked,
          }));
        },
        async getCurrentAuctionPrice() {
          return CurrencyAmount.fromUnscaled(
            (await sdk.client.actions.getCurrentAuctionPrice(
              land.location,
            ))! as string,
          );
        },
        async getYieldInfo() {
          const result = (await sdk.client.actions.getNeighborsYield(
            land.location,
          )) as LandYieldInfo | undefined;

          return result;
        },
        async levelUp() {
          return await sdk.client.actions.levelUp(
            account()?.getAccount()!,
            land.location,
          );
        },
        getEstimatedNukeTime() {
          return estimateNukeTime(
            land.sellPrice.rawValue().toNumber(),
            land.stakeAmount.rawValue().toNumber(),
            getNeighbours(land.location, landWithActions).filter(
              (l) => l != undefined,
            ).length,
          );
        },
      }));

    return landWithActions;
  });

  return {
    ...landEntityStore,
    buyLand(location, setup) {
      return sdk.client.actions.buy(
        account()?.getWalletAccount()!,
        location,
        setup.tokenForSaleAddress,
        setup.salePrice.toBignumberish(),
        setup.amountToStake.toBignumberish(),
        setup.liquidityPoolAddress,
        setup.tokenAddress,
        setup.currentPrice!.toBignumberish(),
      );
    },

    // TODO(#53): Split this action in two, and migrate the call to the session account
    bidLand(location, setup) {
      return sdk.client.actions.bid(
        account()?.getWalletAccount()!,
        location,
        setup.tokenForSaleAddress,
        setup.salePrice.toBignumberish(),
        setup.amountToStake.toBignumberish(),
        setup.liquidityPoolAddress,
        setup.tokenAddress,
        setup.currentPrice!.toBignumberish(),
      );
    },
    auctionLand(location, startPrice, floorPrice, decayRate) {
      return sdk.client.actions.auction(
        account()?.getWalletAccount()!,
        location,
        startPrice.toBignumberish(),
        floorPrice.toBignumberish(),
        decayRate,
        false,
      );
    },
  };
}

// an array of nukable locations
export const nukableStore = writable<bigint[]>([]);
