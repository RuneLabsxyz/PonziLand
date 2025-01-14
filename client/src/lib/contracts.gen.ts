import { DojoProvider } from '@dojoengine/core';
import {
  Account,
  AccountInterface,
  cairo,
  CallData,
  type BigNumberish,
} from 'starknet';

export async function setupWorld(provider: DojoProvider) {
  const actions_auction = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    startPrice: BigNumberish,
    floorPrice: BigNumberish,
    tokenForSale: string,
    decayRate: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: 'actions',
          entrypoint: 'auction',
          calldata: CallData.compile([
            landLocation,
            cairo.uint256(startPrice),
            cairo.uint256(floorPrice),
            tokenForSale,
            decayRate,
          ]),
        },
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_bid = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
    liquidityPool: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: 'actions',
          entrypoint: 'bid',
          calldata: CallData.compile({
            landLocation,
            tokenForSale,
            sellPrice: cairo.uint256(sellPrice),
            amountToStake: cairo.uint256(amountToStake),
            liquidityPool,
          }),
        },
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_buy = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
    liquidityPool: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: 'actions',
          entrypoint: 'buy',
          calldata: [
            landLocation,
            tokenForSale,
            sellPrice,
            amountToStake,
            liquidityPool,
          ],
        },
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_claim = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: 'actions',
          entrypoint: 'claim',
          calldata: [landLocation],
        },
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_nuke = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: 'actions',
          entrypoint: 'nuke',
          calldata: [landLocation],
        },
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_increasePrice = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    newPrice: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: 'actions',
          entrypoint: 'increase_price',
          calldata: [landLocation, newPrice],
        },
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_increaseStake = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    amountToStake: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: 'actions',
          entrypoint: 'increase_stake',
          calldata: [landLocation, amountToStake],
        },
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_getStakeBalance = async (staker: string) => {
    try {
      return await provider.call('ponzi_land', {
        contractName: 'actions',
        entrypoint: 'get_stake_balance',
        calldata: [staker],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const actions_getLand = async (landLocation: BigNumberish) => {
    try {
      return await provider.call('ponzi_land', {
        contractName: 'actions',
        entrypoint: 'get_land',
        calldata: [landLocation],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const actions_getPendingTaxes = async (ownerLand: string) => {
    try {
      return await provider.call('ponzi_land', {
        contractName: 'actions',
        entrypoint: 'get_pending_taxes',
        calldata: [ownerLand],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const actions_getPendingTaxesForLand = async (
    landLocation: BigNumberish,
    ownerLand: string,
  ) => {
    try {
      return await provider.call('ponzi_land', {
        contractName: 'actions',
        entrypoint: 'get_pending_taxes_for_land',
        calldata: [landLocation, ownerLand],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const actions_getCurrentAuctionPrice = async (landLocation: BigNumberish) => {
    try {
      return await provider.call('ponzi_land', {
        contractName: 'actions',
        entrypoint: 'get_current_auction_price',
        calldata: [landLocation],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const actions_getNextClaimInfo = async (landLocation: BigNumberish) => {
    try {
      return await provider.call('ponzi_land', {
        contractName: 'actions',
        entrypoint: 'get_next_claim_info',
        calldata: [landLocation],
      });
    } catch (error) {
      console.error(error);
    }
  };

  return {
    actions: {
      auction: actions_auction,
      bid: actions_bid,
      buy: actions_buy,
      claim: actions_claim,
      nuke: actions_nuke,
      increasePrice: actions_increasePrice,
      increaseStake: actions_increaseStake,
      getStakeBalance: actions_getStakeBalance,
      getLand: actions_getLand,
      getPendingTaxes: actions_getPendingTaxes,
      getPendingTaxesForLand: actions_getPendingTaxesForLand,
      getCurrentAuctionPrice: actions_getCurrentAuctionPrice,
      getNextClaimInfo: actions_getNextClaimInfo,
    },
  };
}
