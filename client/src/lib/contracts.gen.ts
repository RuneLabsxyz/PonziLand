import { DojoProvider } from "@dojoengine/core";
import { Account, AccountInterface, type BigNumberish } from "starknet";
import * as models from "./models.gen";

export async function setupWorld(provider: DojoProvider) {
  const actions_auction = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    startPrice: BigNumberish,
    floorPrice: BigNumberish,
    tokenForSale: string
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: "actions",
          entrypoint: "auction",
          calldata: [landLocation, startPrice, floorPrice, tokenForSale],
        },
        "ponzi_land"
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
    liquidityPool: string
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: "actions",
          entrypoint: "bid",
          calldata: [
            landLocation,
            tokenForSale,
            sellPrice,
            amountToStake,
            liquidityPool,
          ],
        },
        "ponzi_land"
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
    liquidityPool: string
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: "actions",
          entrypoint: "buy",
          calldata: [
            landLocation,
            tokenForSale,
            sellPrice,
            amountToStake,
            liquidityPool,
          ],
        },
        "ponzi_land"
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_claim = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: "actions",
          entrypoint: "claim",
          calldata: [landLocation],
        },
        "ponzi_land"
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_nuke = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: "actions",
          entrypoint: "nuke",
          calldata: [landLocation],
        },
        "ponzi_land"
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_increasePrice = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    newPrice: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: "actions",
          entrypoint: "increase_price",
          calldata: [landLocation, newPrice],
        },
        "ponzi_land"
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_increaseStake = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    amountToStake: BigNumberish
  ) => {
    try {
      return await provider.execute(
        snAccount,
        {
          contractName: "actions",
          entrypoint: "increase_stake",
          calldata: [landLocation, amountToStake],
        },
        "ponzi_land"
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_getStakeBalance = async (staker: string) => {
    try {
      return await provider.call("ponzi_land", {
        contractName: "actions",
        entrypoint: "get_stake_balance",
        calldata: [staker],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const actions_getLand = async (landLocation: BigNumberish) => {
    try {
      return await provider.call("ponzi_land", {
        contractName: "actions",
        entrypoint: "get_land",
        calldata: [landLocation],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const actions_getPendingTaxes = async (ownerLand: string) => {
    try {
      return await provider.call("ponzi_land", {
        contractName: "actions",
        entrypoint: "get_pending_taxes",
        calldata: [ownerLand],
      });
    } catch (error) {
      console.error(error);
    }
  };

  const actions_getCurrentAuctionPrice = async (landLocation: BigNumberish) => {
    try {
      return await provider.call("ponzi_land", {
        contractName: "actions",
        entrypoint: "get_current_auction_price",
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
      getCurrentAuctionPrice: actions_getCurrentAuctionPrice,
    },
  };
}
