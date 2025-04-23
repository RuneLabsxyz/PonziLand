import { type DojoCall, DojoProvider } from '@dojoengine/core';
import {
  CallData,
  Account,
  AccountInterface,
  type BigNumberish,
} from 'starknet';
import * as models from './models.gen';

export function setupWorld(provider: DojoProvider) {
  const build_auth_addAuthorized_calldata = (address: string): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'add_authorized',
      calldata: [address],
    };
  };

  const auth_addAuthorized = async (
    snAccount: Account | AccountInterface,
    address: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_auth_addAuthorized_calldata(address),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_auth_addAuthorizedWithSignature_calldata = (
    signature: Array<BigNumberish>,
  ): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'add_authorized_with_signature',
      calldata: [signature],
    };
  };

  const auth_addAuthorizedWithSignature = async (
    snAccount: Account | AccountInterface,
    signature: Array<BigNumberish>,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_auth_addAuthorizedWithSignature_calldata(signature),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_auth_addVerifier_calldata = (newVerifier: string): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'add_verifier',
      calldata: [newVerifier],
    };
  };

  const auth_addVerifier = async (
    snAccount: Account | AccountInterface,
    newVerifier: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_auth_addVerifier_calldata(newVerifier),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_auction_calldata = (
    landLocation: BigNumberish,
    startPrice: BigNumberish,
    floorPrice: BigNumberish,
    decayRate: BigNumberish,
    isFromNuke: boolean,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'auction',
      calldata: [landLocation, startPrice, floorPrice, decayRate, isFromNuke],
    };
  };

  const actions_auction = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    startPrice: BigNumberish,
    floorPrice: BigNumberish,
    decayRate: BigNumberish,
    isFromNuke: boolean,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_auction_calldata(
          landLocation,
          startPrice,
          floorPrice,
          decayRate,
          isFromNuke,
        ),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_bid_calldata = (
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'bid',
      calldata: [landLocation, tokenForSale, sellPrice, amountToStake],
    };
  };

  const actions_bid = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_bid_calldata(
          landLocation,
          tokenForSale,
          sellPrice,
          amountToStake,
        ),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_buy_calldata = (
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'buy',
      calldata: [landLocation, tokenForSale, sellPrice, amountToStake],
    };
  };

  const actions_buy = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_buy_calldata(
          landLocation,
          tokenForSale,
          sellPrice,
          amountToStake,
        ),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_auth_canTakeAction_calldata = (address: string): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'can_take_action',
      calldata: [address],
    };
  };

  const auth_canTakeAction = async (address: string) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_auth_canTakeAction_calldata(address),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_claim_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'claim',
      calldata: [landLocation],
    };
  };

  const actions_claim = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_claim_calldata(landLocation),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_getTimeToNuke_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_time_to_nuke',
      calldata: [landLocation],
    };
  };

  const actions_getTimeToNuke = async (landLocation: BigNumberish) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getTimeToNuke_calldata(landLocation),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_claimAll_calldata = (
    landLocations: Array<BigNumberish>,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'claim_all',
      calldata: [landLocations],
    };
  };

  const actions_claimAll = async (
    snAccount: Account | AccountInterface,
    landLocations: Array<BigNumberish>,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_claimAll_calldata(landLocations),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_getActiveAuctions_calldata = (): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_active_auctions',
      calldata: [],
    };
  };

  const actions_getActiveAuctions = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getActiveAuctions_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_getAuction_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_auction',
      calldata: [landLocation],
    };
  };

  const actions_getAuction = async (landLocation: BigNumberish) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getAuction_calldata(landLocation),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_getCurrentAuctionPrice_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_current_auction_price',
      calldata: [landLocation],
    };
  };

  const actions_getCurrentAuctionPrice = async (landLocation: BigNumberish) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getCurrentAuctionPrice_calldata(landLocation),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_getLand_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_land',
      calldata: [landLocation],
    };
  };

  const actions_getLand = async (landLocation: BigNumberish) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getLand_calldata(landLocation),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_getNeighborsYield_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_neighbors_yield',
      calldata: [landLocation],
    };
  };

  const actions_getNeighborsYield = async (landLocation: BigNumberish) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getNeighborsYield_calldata(landLocation),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_getNextClaimInfo_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_next_claim_info',
      calldata: [landLocation],
    };
  };

  const actions_getNextClaimInfo = async (landLocation: BigNumberish) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getNextClaimInfo_calldata(landLocation),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_auth_getOwner_calldata = (): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'get_owner',
      calldata: [],
    };
  };

  const auth_getOwner = async () => {
    try {
      return await provider.call('ponzi_land', build_auth_getOwner_calldata());
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_getPendingTaxesForLand_calldata = (
    landLocation: BigNumberish,
    ownerLand: string,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_pending_taxes_for_land',
      calldata: [landLocation, ownerLand],
    };
  };

  const actions_getPendingTaxesForLand = async (
    landLocation: BigNumberish,
    ownerLand: string,
  ) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getPendingTaxesForLand_calldata(landLocation, ownerLand),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_increasePrice_calldata = (
    landLocation: BigNumberish,
    newPrice: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'increase_price',
      calldata: [landLocation, newPrice],
    };
  };

  const actions_increasePrice = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    newPrice: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_increasePrice_calldata(landLocation, newPrice),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_increaseStake_calldata = (
    landLocation: BigNumberish,
    amountToStake: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'increase_stake',
      calldata: [landLocation, amountToStake],
    };
  };

  const actions_increaseStake = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    amountToStake: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_increaseStake_calldata(landLocation, amountToStake),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_levelUp_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'level_up',
      calldata: [landLocation],
    };
  };

  const actions_levelUp = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_levelUp_calldata(landLocation),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_auth_lockActions_calldata = (): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'lock_actions',
      calldata: [],
    };
  };

  const auth_lockActions = async (snAccount: Account | AccountInterface) => {
    try {
      return await provider.execute(
        snAccount,
        build_auth_lockActions_calldata(),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_nuke_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'nuke',
      calldata: [landLocation],
    };
  };

  const actions_nuke = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_nuke_calldata(landLocation),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_reimburseStakes_calldata = (): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'reimburse_stakes',
      calldata: [],
    };
  };

  const actions_reimburseStakes = async (
    snAccount: Account | AccountInterface,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_reimburseStakes_calldata(),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_auth_removeAuthorized_calldata = (address: string): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'remove_authorized',
      calldata: [address],
    };
  };

  const auth_removeAuthorized = async (
    snAccount: Account | AccountInterface,
    address: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_auth_removeAuthorized_calldata(address),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_auth_removeVerifier_calldata = (verifier: string): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'remove_verifier',
      calldata: [verifier],
    };
  };

  const auth_removeVerifier = async (
    snAccount: Account | AccountInterface,
    verifier: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_auth_removeVerifier_calldata(verifier),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_auth_setVerifier_calldata = (
    newVerifier: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'set_verifier',
      calldata: [newVerifier],
    };
  };

  const auth_setVerifier = async (
    snAccount: Account | AccountInterface,
    newVerifier: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_auth_setVerifier_calldata(newVerifier),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_auth_unlockActions_calldata = (): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'unlock_actions',
      calldata: [],
    };
  };

  const auth_unlockActions = async (snAccount: Account | AccountInterface) => {
    try {
      return await provider.execute(
        snAccount,
        build_auth_unlockActions_calldata(),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return {
    auth: {
      addAuthorized: auth_addAuthorized,
      buildAddAuthorizedCalldata: build_auth_addAuthorized_calldata,
      addAuthorizedWithSignature: auth_addAuthorizedWithSignature,
      buildAddAuthorizedWithSignatureCalldata:
        build_auth_addAuthorizedWithSignature_calldata,
      addVerifier: auth_addVerifier,
      buildAddVerifierCalldata: build_auth_addVerifier_calldata,
      canTakeAction: auth_canTakeAction,
      buildCanTakeActionCalldata: build_auth_canTakeAction_calldata,
      getOwner: auth_getOwner,
      buildGetOwnerCalldata: build_auth_getOwner_calldata,
      lockActions: auth_lockActions,
      buildLockActionsCalldata: build_auth_lockActions_calldata,
      removeAuthorized: auth_removeAuthorized,
      buildRemoveAuthorizedCalldata: build_auth_removeAuthorized_calldata,
      removeVerifier: auth_removeVerifier,
      buildRemoveVerifierCalldata: build_auth_removeVerifier_calldata,
      setVerifier: auth_setVerifier,
      buildSetVerifierCalldata: build_auth_setVerifier_calldata,
      unlockActions: auth_unlockActions,
      buildUnlockActionsCalldata: build_auth_unlockActions_calldata,
    },
    actions: {
      auction: actions_auction,
      buildAuctionCalldata: build_actions_auction_calldata,
      bid: actions_bid,
      buildBidCalldata: build_actions_bid_calldata,
      buy: actions_buy,
      buildBuyCalldata: build_actions_buy_calldata,
      claim: actions_claim,
      buildClaimCalldata: build_actions_claim_calldata,
      claimAll: actions_claimAll,
      buildClaimAllCalldata: build_actions_claimAll_calldata,
      getActiveAuctions: actions_getActiveAuctions,
      buildGetActiveAuctionsCalldata: build_actions_getActiveAuctions_calldata,
      getTimeToNuke: actions_getTimeToNuke,
      buildGetTimeToNukeCalldata: build_actions_getTimeToNuke_calldata,
      getAuction: actions_getAuction,
      buildGetAuctionCalldata: build_actions_getAuction_calldata,
      getCurrentAuctionPrice: actions_getCurrentAuctionPrice,
      buildGetCurrentAuctionPriceCalldata:
        build_actions_getCurrentAuctionPrice_calldata,
      getLand: actions_getLand,
      buildGetLandCalldata: build_actions_getLand_calldata,
      getNeighborsYield: actions_getNeighborsYield,
      buildGetNeighborsYieldCalldata: build_actions_getNeighborsYield_calldata,
      getNextClaimInfo: actions_getNextClaimInfo,
      buildGetNextClaimInfoCalldata: build_actions_getNextClaimInfo_calldata,
      getPendingTaxesForLand: actions_getPendingTaxesForLand,
      buildGetPendingTaxesForLandCalldata:
        build_actions_getPendingTaxesForLand_calldata,
      increasePrice: actions_increasePrice,
      buildIncreasePriceCalldata: build_actions_increasePrice_calldata,
      increaseStake: actions_increaseStake,
      buildIncreaseStakeCalldata: build_actions_increaseStake_calldata,
      levelUp: actions_levelUp,
      buildLevelUpCalldata: build_actions_levelUp_calldata,
      nuke: actions_nuke,
      buildNukeCalldata: build_actions_nuke_calldata,
      reimburseStakes: actions_reimburseStakes,
      buildReimburseStakesCalldata: build_actions_reimburseStakes_calldata,
    },
  };
}
