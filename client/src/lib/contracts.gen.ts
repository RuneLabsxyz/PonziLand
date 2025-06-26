import { DojoProvider, type DojoCall } from '@dojoengine/core';
import {
  Account,
  AccountInterface,
  type BigNumberish,
  CairoOption,
  CairoCustomEnum,
  type ByteArray,
} from 'starknet';
import * as models from './models.gen';

export function setupWorld(provider: DojoProvider) {
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

  const build_actions_getClaimableTaxesForLand_calldata = (
    landLocation: BigNumberish,
    owner: string,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_claimable_taxes_for_land',
      calldata: [landLocation, owner],
    };
  };

  const actions_getClaimableTaxesForLand = async (
    landLocation: BigNumberish,
    owner: string,
  ) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getClaimableTaxesForLand_calldata(landLocation, owner),
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

  const build_actions_getGameSpeed_calldata = (): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_game_speed',
      calldata: [],
    };
  };

  const actions_getGameSpeed = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getGameSpeed_calldata(),
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

  const build_actions_getNeighbors_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_neighbors',
      calldata: [landLocation],
    };
  };

  const actions_getNeighbors = async (landLocation: BigNumberish) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getNeighbors_calldata(landLocation),
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

  const build_actions_getPendingTaxesForLand_calldata = (
    landLocation: BigNumberish,
    owner: string,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_pending_taxes_for_land',
      calldata: [landLocation, owner],
    };
  };

  const actions_getPendingTaxesForLand = async (
    landLocation: BigNumberish,
    owner: string,
  ) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getPendingTaxesForLand_calldata(landLocation, owner),
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

  const build_actions_getUnclaimedTaxesPerNeighbor_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_unclaimed_taxes_per_neighbor',
      calldata: [landLocation],
    };
  };

  const actions_getUnclaimedTaxesPerNeighbor = async (
    landLocation: BigNumberish,
  ) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getUnclaimedTaxesPerNeighbor_calldata(landLocation),
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

  const build_actions_recreateAuction_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'recreate_auction',
      calldata: [landLocation],
    };
  };

  const actions_recreateAuction = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_recreateAuction_calldata(landLocation),
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

  const build_actions_setMainToken_calldata = (
    tokenAddress: string,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'set_main_token',
      calldata: [tokenAddress],
    };
  };

  const actions_setMainToken = async (
    snAccount: Account | AccountInterface,
    tokenAddress: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_setMainToken_calldata(tokenAddress),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

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

  const build_auth_ensureDeploy_calldata = (): DojoCall => {
    return {
      contractName: 'auth',
      entrypoint: 'ensure_deploy',
      calldata: [],
    };
  };

  const auth_ensureDeploy = async (snAccount: Account | AccountInterface) => {
    try {
      return await provider.execute(
        snAccount,
        build_auth_ensureDeploy_calldata(),
        'ponzi_land',
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

  const build_quests_claimReward_calldata = (
    questId: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'quests',
      entrypoint: 'claim_reward',
      calldata: [questId],
    };
  };

  const quests_claimReward = async (
    snAccount: Account | AccountInterface,
    questId: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_quests_claimReward_calldata(questId),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_quests_createQuest_calldata = (
    gameAddress: string,
    location: BigNumberish,
    rewardResourceType: BigNumberish,
    rewardAmount: BigNumberish,
    settingsId: BigNumberish,
    targetScore: BigNumberish,
    capacity: BigNumberish,
    expiresAt: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'quests',
      entrypoint: 'create_quest',
      calldata: [
        gameAddress,
        location,
        rewardResourceType,
        rewardAmount,
        settingsId,
        targetScore,
        capacity,
        expiresAt,
      ],
    };
  };

  const quests_createQuest = async (
    snAccount: Account | AccountInterface,
    gameAddress: string,
    location: BigNumberish,
    rewardResourceType: BigNumberish,
    rewardAmount: BigNumberish,
    settingsId: BigNumberish,
    targetScore: BigNumberish,
    capacity: BigNumberish,
    expiresAt: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_quests_createQuest_calldata(
          gameAddress,
          location,
          rewardResourceType,
          rewardAmount,
          settingsId,
          targetScore,
          capacity,
          expiresAt,
        ),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_quests_getQuest_calldata = (questId: BigNumberish): DojoCall => {
    return {
      contractName: 'quests',
      entrypoint: 'get_quest',
      calldata: [questId],
    };
  };

  const quests_getQuest = async (
    snAccount: Account | AccountInterface,
    questId: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_quests_getQuest_calldata(questId),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_quests_getQuestDetails_calldata = (
    detailsId: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'quests',
      entrypoint: 'get_quest_details',
      calldata: [detailsId],
    };
  };

  const quests_getQuestDetails = async (
    snAccount: Account | AccountInterface,
    detailsId: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_quests_getQuestDetails_calldata(detailsId),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_quests_removeLandQuest_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'quests',
      entrypoint: 'remove_land_quest',
      calldata: [landLocation],
    };
  };

  const quests_removeLandQuest = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_quests_removeLandQuest_calldata(landLocation),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_quests_setLandQuest_calldata = (
    landLocation: BigNumberish,
    settingsId: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'quests',
      entrypoint: 'set_land_quest',
      calldata: [landLocation, settingsId],
    };
  };

  const quests_setLandQuest = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    settingsId: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_quests_setLandQuest_calldata(landLocation, settingsId),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_quests_startQuest_calldata = (
    landLocation: BigNumberish,
    playerName: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'quests',
      entrypoint: 'start_quest',
      calldata: [landLocation, playerName],
    };
  };

  const quests_startQuest = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    playerName: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_quests_startQuest_calldata(landLocation, playerName),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_token_registry_ensureTokenAuthorized_calldata = (
    tokenAddress: string,
  ): DojoCall => {
    return {
      contractName: 'token_registry',
      entrypoint: 'ensure_token_authorized',
      calldata: [tokenAddress],
    };
  };

  const token_registry_ensureTokenAuthorized = async (tokenAddress: string) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_token_registry_ensureTokenAuthorized_calldata(tokenAddress),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_token_registry_isTokenAuthorized_calldata = (
    tokenAddress: string,
  ): DojoCall => {
    return {
      contractName: 'token_registry',
      entrypoint: 'is_token_authorized',
      calldata: [tokenAddress],
    };
  };

  const token_registry_isTokenAuthorized = async (tokenAddress: string) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_token_registry_isTokenAuthorized_calldata(tokenAddress),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_token_registry_registerToken_calldata = (
    tokenAddress: string,
  ): DojoCall => {
    return {
      contractName: 'token_registry',
      entrypoint: 'register_token',
      calldata: [tokenAddress],
    };
  };

  const token_registry_registerToken = async (
    snAccount: Account | AccountInterface,
    tokenAddress: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_token_registry_registerToken_calldata(tokenAddress),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_token_registry_removeToken_calldata = (
    tokenAddress: string,
  ): DojoCall => {
    return {
      contractName: 'token_registry',
      entrypoint: 'remove_token',
      calldata: [tokenAddress],
    };
  };

  const token_registry_removeToken = async (
    snAccount: Account | AccountInterface,
    tokenAddress: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_token_registry_removeToken_calldata(tokenAddress),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return {
    actions: {
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
      getAuction: actions_getAuction,
      buildGetAuctionCalldata: build_actions_getAuction_calldata,
      getClaimableTaxesForLand: actions_getClaimableTaxesForLand,
      buildGetClaimableTaxesForLandCalldata:
        build_actions_getClaimableTaxesForLand_calldata,
      getCurrentAuctionPrice: actions_getCurrentAuctionPrice,
      buildGetCurrentAuctionPriceCalldata:
        build_actions_getCurrentAuctionPrice_calldata,
      getGameSpeed: actions_getGameSpeed,
      buildGetGameSpeedCalldata: build_actions_getGameSpeed_calldata,
      getLand: actions_getLand,
      buildGetLandCalldata: build_actions_getLand_calldata,
      getNeighbors: actions_getNeighbors,
      buildGetNeighborsCalldata: build_actions_getNeighbors_calldata,
      getNeighborsYield: actions_getNeighborsYield,
      buildGetNeighborsYieldCalldata: build_actions_getNeighborsYield_calldata,
      getNextClaimInfo: actions_getNextClaimInfo,
      buildGetNextClaimInfoCalldata: build_actions_getNextClaimInfo_calldata,
      getPendingTaxesForLand: actions_getPendingTaxesForLand,
      buildGetPendingTaxesForLandCalldata:
        build_actions_getPendingTaxesForLand_calldata,
      getTimeToNuke: actions_getTimeToNuke,
      buildGetTimeToNukeCalldata: build_actions_getTimeToNuke_calldata,
      getUnclaimedTaxesPerNeighbor: actions_getUnclaimedTaxesPerNeighbor,
      buildGetUnclaimedTaxesPerNeighborCalldata:
        build_actions_getUnclaimedTaxesPerNeighbor_calldata,
      increasePrice: actions_increasePrice,
      buildIncreasePriceCalldata: build_actions_increasePrice_calldata,
      increaseStake: actions_increaseStake,
      buildIncreaseStakeCalldata: build_actions_increaseStake_calldata,
      levelUp: actions_levelUp,
      buildLevelUpCalldata: build_actions_levelUp_calldata,
      recreateAuction: actions_recreateAuction,
      buildRecreateAuctionCalldata: build_actions_recreateAuction_calldata,
      reimburseStakes: actions_reimburseStakes,
      buildReimburseStakesCalldata: build_actions_reimburseStakes_calldata,
      setMainToken: actions_setMainToken,
      buildSetMainTokenCalldata: build_actions_setMainToken_calldata,
    },
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
      ensureDeploy: auth_ensureDeploy,
      buildEnsureDeployCalldata: build_auth_ensureDeploy_calldata,
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
    quests: {
      claimReward: quests_claimReward,
      buildClaimRewardCalldata: build_quests_claimReward_calldata,
      createQuest: quests_createQuest,
      buildCreateQuestCalldata: build_quests_createQuest_calldata,
      getQuest: quests_getQuest,
      buildGetQuestCalldata: build_quests_getQuest_calldata,
      getQuestDetails: quests_getQuestDetails,
      buildGetQuestDetailsCalldata: build_quests_getQuestDetails_calldata,
      removeLandQuest: quests_removeLandQuest,
      buildRemoveLandQuestCalldata: build_quests_removeLandQuest_calldata,
      setLandQuest: quests_setLandQuest,
      buildSetLandQuestCalldata: build_quests_setLandQuest_calldata,
      startQuest: quests_startQuest,
      buildStartQuestCalldata: build_quests_startQuest_calldata,
    },
    token_registry: {
      ensureTokenAuthorized: token_registry_ensureTokenAuthorized,
      buildEnsureTokenAuthorizedCalldata:
        build_token_registry_ensureTokenAuthorized_calldata,
      isTokenAuthorized: token_registry_isTokenAuthorized,
      buildIsTokenAuthorizedCalldata:
        build_token_registry_isTokenAuthorized_calldata,
      registerToken: token_registry_registerToken,
      buildRegisterTokenCalldata: build_token_registry_registerToken_calldata,
      removeToken: token_registry_removeToken,
      buildRemoveTokenCalldata: build_token_registry_removeToken_calldata,
    },
  };
}
