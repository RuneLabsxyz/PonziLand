import { DojoProvider, type DojoCall } from '@dojoengine/core';
import { Account, AccountInterface, type BigNumberish } from 'starknet';
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

  const build_actions_getElapsedTimeSinceLastClaim_calldata = (
    claimerLocation: BigNumberish,
    payerLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_elapsed_time_since_last_claim',
      calldata: [claimerLocation, payerLocation],
    };
  };

  const actions_getElapsedTimeSinceLastClaim = async (
    claimerLocation: BigNumberish,
    payerLocation: BigNumberish,
  ) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getElapsedTimeSinceLastClaim_calldata(
          claimerLocation,
          payerLocation,
        ),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_getElapsedTimeSinceLastClaimForNeighbors_calldata = (
    payerLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_elapsed_time_since_last_claim_for_neighbors',
      calldata: [payerLocation],
    };
  };

  const actions_getElapsedTimeSinceLastClaimForNeighbors = async (
    payerLocation: BigNumberish,
  ) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getElapsedTimeSinceLastClaimForNeighbors_calldata(
          payerLocation,
        ),
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
    claimerLocation: BigNumberish,
    payerLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_unclaimed_taxes_per_neighbor',
      calldata: [claimerLocation, payerLocation],
    };
  };

  const actions_getUnclaimedTaxesPerNeighbor = async (
    claimerLocation: BigNumberish,
    payerLocation: BigNumberish,
  ) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getUnclaimedTaxesPerNeighbor_calldata(
          claimerLocation,
          payerLocation,
        ),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_getUnclaimedTaxesPerNeighborsTotal_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'get_unclaimed_taxes_per_neighbors_total',
      calldata: [landLocation],
    };
  };

  const actions_getUnclaimedTaxesPerNeighborsTotal = async (
    landLocation: BigNumberish,
  ) => {
    try {
      return await provider.call(
        'ponzi_land',
        build_actions_getUnclaimedTaxesPerNeighborsTotal_calldata(landLocation),
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

  const build_actions_withdrawStake_calldata = (
    landLocation: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'withdraw_stake',
      calldata: [landLocation],
    };
  };

  const actions_withdrawStake = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_withdrawStake_calldata(landLocation),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_actions_withdrawStakesBatch_calldata = (
    landLocations: Array<BigNumberish>,
  ): DojoCall => {
    return {
      contractName: 'actions',
      entrypoint: 'withdraw_stakes_batch',
      calldata: [landLocations],
    };
  };

  const actions_withdrawStakesBatch = async (
    snAccount: Account | AccountInterface,
    landLocations: Array<BigNumberish>,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_actions_withdrawStakesBatch_calldata(landLocations),
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

  const build_config_getAuctionDuration_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_auction_duration',
      calldata: [],
    };
  };

  const config_getAuctionDuration = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getAuctionDuration_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getBaseTime_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_base_time',
      calldata: [],
    };
  };

  const config_getBaseTime = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getBaseTime_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getBuyFee_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_buy_fee',
      calldata: [],
    };
  };

  const config_getBuyFee = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getBuyFee_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getCenterLocation_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_center_location',
      calldata: [],
    };
  };

  const config_getCenterLocation = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getCenterLocation_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getClaimFee_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_claim_fee',
      calldata: [],
    };
  };

  const config_getClaimFee = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getClaimFee_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getClaimFeeThreshold_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_claim_fee_threshold',
      calldata: [],
    };
  };

  const config_getClaimFeeThreshold = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getClaimFeeThreshold_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getDecayRate_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_decay_rate',
      calldata: [],
    };
  };

  const config_getDecayRate = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getDecayRate_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getDropRate_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_drop_rate',
      calldata: [],
    };
  };

  const config_getDropRate = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getDropRate_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getFloorPrice_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_floor_price',
      calldata: [],
    };
  };

  const config_getFloorPrice = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getFloorPrice_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getGridWidth_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_grid_width',
      calldata: [],
    };
  };

  const config_getGridWidth = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getGridWidth_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getLinearDecayTime_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_linear_decay_time',
      calldata: [],
    };
  };

  const config_getLinearDecayTime = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getLinearDecayTime_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getLiquiditySafetyMultiplier_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_liquidity_safety_multiplier',
      calldata: [],
    };
  };

  const config_getLiquiditySafetyMultiplier = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getLiquiditySafetyMultiplier_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getMainCurrency_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_main_currency',
      calldata: [],
    };
  };

  const config_getMainCurrency = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getMainCurrency_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getMaxAuctions_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_max_auctions',
      calldata: [],
    };
  };

  const config_getMaxAuctions = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getMaxAuctions_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getMaxAuctionsFromBid_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_max_auctions_from_bid',
      calldata: [],
    };
  };

  const config_getMaxAuctionsFromBid = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getMaxAuctionsFromBid_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getMaxCircles_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_max_circles',
      calldata: [],
    };
  };

  const config_getMaxCircles = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getMaxCircles_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getMinAuctionPrice_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_min_auction_price',
      calldata: [],
    };
  };

  const config_getMinAuctionPrice = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getMinAuctionPrice_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getMinAuctionPriceMultiplier_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_min_auction_price_multiplier',
      calldata: [],
    };
  };

  const config_getMinAuctionPriceMultiplier = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getMinAuctionPriceMultiplier_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getPriceDecreaseRate_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_price_decrease_rate',
      calldata: [],
    };
  };

  const config_getPriceDecreaseRate = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getPriceDecreaseRate_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getRateDenominator_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_rate_denominator',
      calldata: [],
    };
  };

  const config_getRateDenominator = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getRateDenominator_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getScalingFactor_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_scaling_factor',
      calldata: [],
    };
  };

  const config_getScalingFactor = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getScalingFactor_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getTaxRate_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_tax_rate',
      calldata: [],
    };
  };

  const config_getTaxRate = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getTaxRate_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_getTimeSpeed_calldata = (): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'get_time_speed',
      calldata: [],
    };
  };

  const config_getTimeSpeed = async () => {
    try {
      return await provider.call(
        'ponzi_land',
        build_config_getTimeSpeed_calldata(),
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setAuctionDuration_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_auction_duration',
      calldata: [value],
    };
  };

  const config_setAuctionDuration = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setAuctionDuration_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setBaseTime_calldata = (value: BigNumberish): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_base_time',
      calldata: [value],
    };
  };

  const config_setBaseTime = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setBaseTime_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setBuyFee_calldata = (value: BigNumberish): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_buy_fee',
      calldata: [value],
    };
  };

  const config_setBuyFee = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setBuyFee_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setCenterLocation_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_center_location',
      calldata: [value],
    };
  };

  const config_setCenterLocation = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setCenterLocation_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setClaimFee_calldata = (value: BigNumberish): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_claim_fee',
      calldata: [value],
    };
  };

  const config_setClaimFee = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setClaimFee_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setClaimFeeThreshold_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_claim_fee_threshold',
      calldata: [value],
    };
  };

  const config_setClaimFeeThreshold = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setClaimFeeThreshold_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setDecayRate_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_decay_rate',
      calldata: [value],
    };
  };

  const config_setDecayRate = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setDecayRate_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setDropRate_calldata = (value: BigNumberish): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_drop_rate',
      calldata: [value],
    };
  };

  const config_setDropRate = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setDropRate_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setFloorPrice_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_floor_price',
      calldata: [value],
    };
  };

  const config_setFloorPrice = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setFloorPrice_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setFullConfig_calldata = (
    gridWidth: BigNumberish,
    taxRate: BigNumberish,
    baseTime: BigNumberish,
    priceDecreaseRate: BigNumberish,
    timeSpeed: BigNumberish,
    maxAuctions: BigNumberish,
    maxAuctionsFromBid: BigNumberish,
    decayRate: BigNumberish,
    floorPrice: BigNumberish,
    liquiditySafetyMultiplier: BigNumberish,
    minAuctionPrice: BigNumberish,
    minAuctionPriceMultiplier: BigNumberish,
    centerLocation: BigNumberish,
    auctionDuration: BigNumberish,
    scalingFactor: BigNumberish,
    linearDecayTime: BigNumberish,
    dropRate: BigNumberish,
    rateDenominator: BigNumberish,
    maxCircles: BigNumberish,
    claimFee: BigNumberish,
    buyFee: BigNumberish,
    ourContractForFee: string,
    ourContractForAuction: string,
    claimFeeThreshold: BigNumberish,
    mainCurrency: string,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_full_config',
      calldata: [
        gridWidth,
        taxRate,
        baseTime,
        priceDecreaseRate,
        timeSpeed,
        maxAuctions,
        maxAuctionsFromBid,
        decayRate,
        floorPrice,
        liquiditySafetyMultiplier,
        minAuctionPrice,
        minAuctionPriceMultiplier,
        centerLocation,
        auctionDuration,
        scalingFactor,
        linearDecayTime,
        dropRate,
        rateDenominator,
        maxCircles,
        claimFee,
        buyFee,
        ourContractForFee,
        ourContractForAuction,
        claimFeeThreshold,
        mainCurrency,
      ],
    };
  };

  const config_setFullConfig = async (
    snAccount: Account | AccountInterface,
    gridWidth: BigNumberish,
    taxRate: BigNumberish,
    baseTime: BigNumberish,
    priceDecreaseRate: BigNumberish,
    timeSpeed: BigNumberish,
    maxAuctions: BigNumberish,
    maxAuctionsFromBid: BigNumberish,
    decayRate: BigNumberish,
    floorPrice: BigNumberish,
    liquiditySafetyMultiplier: BigNumberish,
    minAuctionPrice: BigNumberish,
    minAuctionPriceMultiplier: BigNumberish,
    centerLocation: BigNumberish,
    auctionDuration: BigNumberish,
    scalingFactor: BigNumberish,
    linearDecayTime: BigNumberish,
    dropRate: BigNumberish,
    rateDenominator: BigNumberish,
    maxCircles: BigNumberish,
    claimFee: BigNumberish,
    buyFee: BigNumberish,
    ourContractForFee: string,
    ourContractForAuction: string,
    claimFeeThreshold: BigNumberish,
    mainCurrency: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setFullConfig_calldata(
          gridWidth,
          taxRate,
          baseTime,
          priceDecreaseRate,
          timeSpeed,
          maxAuctions,
          maxAuctionsFromBid,
          decayRate,
          floorPrice,
          liquiditySafetyMultiplier,
          minAuctionPrice,
          minAuctionPriceMultiplier,
          centerLocation,
          auctionDuration,
          scalingFactor,
          linearDecayTime,
          dropRate,
          rateDenominator,
          maxCircles,
          claimFee,
          buyFee,
          ourContractForFee,
          ourContractForAuction,
          claimFeeThreshold,
          mainCurrency,
        ),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setGridWidth_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_grid_width',
      calldata: [value],
    };
  };

  const config_setGridWidth = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setGridWidth_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setLinearDecayTime_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_linear_decay_time',
      calldata: [value],
    };
  };

  const config_setLinearDecayTime = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setLinearDecayTime_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setLiquiditySafetyMultiplier_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_liquidity_safety_multiplier',
      calldata: [value],
    };
  };

  const config_setLiquiditySafetyMultiplier = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setLiquiditySafetyMultiplier_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setMainCurrency_calldata = (value: string): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_main_currency',
      calldata: [value],
    };
  };

  const config_setMainCurrency = async (
    snAccount: Account | AccountInterface,
    value: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setMainCurrency_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setMaxAuctions_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_max_auctions',
      calldata: [value],
    };
  };

  const config_setMaxAuctions = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setMaxAuctions_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setMaxAuctionsFromBid_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_max_auctions_from_bid',
      calldata: [value],
    };
  };

  const config_setMaxAuctionsFromBid = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setMaxAuctionsFromBid_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setMaxCircles_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_max_circles',
      calldata: [value],
    };
  };

  const config_setMaxCircles = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setMaxCircles_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setMinAuctionPrice_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_min_auction_price',
      calldata: [value],
    };
  };

  const config_setMinAuctionPrice = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setMinAuctionPrice_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setMinAuctionPriceMultiplier_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_min_auction_price_multiplier',
      calldata: [value],
    };
  };

  const config_setMinAuctionPriceMultiplier = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setMinAuctionPriceMultiplier_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setOurContractForAuction_calldata = (
    value: string,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_our_contract_for_auction',
      calldata: [value],
    };
  };

  const config_setOurContractForAuction = async (
    snAccount: Account | AccountInterface,
    value: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setOurContractForAuction_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setOurContractForFee_calldata = (
    value: string,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_our_contract_for_fee',
      calldata: [value],
    };
  };

  const config_setOurContractForFee = async (
    snAccount: Account | AccountInterface,
    value: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setOurContractForFee_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setPriceDecreaseRate_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_price_decrease_rate',
      calldata: [value],
    };
  };

  const config_setPriceDecreaseRate = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setPriceDecreaseRate_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setRateDenominator_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_rate_denominator',
      calldata: [value],
    };
  };

  const config_setRateDenominator = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setRateDenominator_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setScalingFactor_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_scaling_factor',
      calldata: [value],
    };
  };

  const config_setScalingFactor = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setScalingFactor_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setTaxRate_calldata = (value: BigNumberish): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_tax_rate',
      calldata: [value],
    };
  };

  const config_setTaxRate = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setTaxRate_calldata(value),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const build_config_setTimeSpeed_calldata = (
    value: BigNumberish,
  ): DojoCall => {
    return {
      contractName: 'config',
      entrypoint: 'set_time_speed',
      calldata: [value],
    };
  };

  const config_setTimeSpeed = async (
    snAccount: Account | AccountInterface,
    value: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        build_config_setTimeSpeed_calldata(value),
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
      getCurrentAuctionPrice: actions_getCurrentAuctionPrice,
      buildGetCurrentAuctionPriceCalldata:
        build_actions_getCurrentAuctionPrice_calldata,
      getElapsedTimeSinceLastClaim: actions_getElapsedTimeSinceLastClaim,
      buildGetElapsedTimeSinceLastClaimCalldata:
        build_actions_getElapsedTimeSinceLastClaim_calldata,
      getElapsedTimeSinceLastClaimForNeighbors:
        actions_getElapsedTimeSinceLastClaimForNeighbors,
      buildGetElapsedTimeSinceLastClaimForNeighborsCalldata:
        build_actions_getElapsedTimeSinceLastClaimForNeighbors_calldata,
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
      getTimeToNuke: actions_getTimeToNuke,
      buildGetTimeToNukeCalldata: build_actions_getTimeToNuke_calldata,
      getUnclaimedTaxesPerNeighbor: actions_getUnclaimedTaxesPerNeighbor,
      buildGetUnclaimedTaxesPerNeighborCalldata:
        build_actions_getUnclaimedTaxesPerNeighbor_calldata,
      getUnclaimedTaxesPerNeighborsTotal:
        actions_getUnclaimedTaxesPerNeighborsTotal,
      buildGetUnclaimedTaxesPerNeighborsTotalCalldata:
        build_actions_getUnclaimedTaxesPerNeighborsTotal_calldata,
      increasePrice: actions_increasePrice,
      buildIncreasePriceCalldata: build_actions_increasePrice_calldata,
      increaseStake: actions_increaseStake,
      buildIncreaseStakeCalldata: build_actions_increaseStake_calldata,
      levelUp: actions_levelUp,
      buildLevelUpCalldata: build_actions_levelUp_calldata,
      recreateAuction: actions_recreateAuction,
      buildRecreateAuctionCalldata: build_actions_recreateAuction_calldata,
      withdrawStake: actions_withdrawStake,
			buildWithdrawStakeCalldata: build_actions_withdrawStake_calldata,
			withdrawStakesBatch: actions_withdrawStakesBatch,
			buildWithdrawStakesBatchCalldata: build_actions_withdrawStakesBatch_calldata,
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
    config: {
      getAuctionDuration: config_getAuctionDuration,
      buildGetAuctionDurationCalldata: build_config_getAuctionDuration_calldata,
      getBaseTime: config_getBaseTime,
      buildGetBaseTimeCalldata: build_config_getBaseTime_calldata,
      getBuyFee: config_getBuyFee,
      buildGetBuyFeeCalldata: build_config_getBuyFee_calldata,
      getCenterLocation: config_getCenterLocation,
      buildGetCenterLocationCalldata: build_config_getCenterLocation_calldata,
      getClaimFee: config_getClaimFee,
      buildGetClaimFeeCalldata: build_config_getClaimFee_calldata,
      getClaimFeeThreshold: config_getClaimFeeThreshold,
      buildGetClaimFeeThresholdCalldata:
        build_config_getClaimFeeThreshold_calldata,
      getDecayRate: config_getDecayRate,
      buildGetDecayRateCalldata: build_config_getDecayRate_calldata,
      getDropRate: config_getDropRate,
      buildGetDropRateCalldata: build_config_getDropRate_calldata,
      getFloorPrice: config_getFloorPrice,
      buildGetFloorPriceCalldata: build_config_getFloorPrice_calldata,
      getGridWidth: config_getGridWidth,
      buildGetGridWidthCalldata: build_config_getGridWidth_calldata,
      getLinearDecayTime: config_getLinearDecayTime,
      buildGetLinearDecayTimeCalldata: build_config_getLinearDecayTime_calldata,
      getLiquiditySafetyMultiplier: config_getLiquiditySafetyMultiplier,
      buildGetLiquiditySafetyMultiplierCalldata:
        build_config_getLiquiditySafetyMultiplier_calldata,
      getMainCurrency: config_getMainCurrency,
      buildGetMainCurrencyCalldata: build_config_getMainCurrency_calldata,
      getMaxAuctions: config_getMaxAuctions,
      buildGetMaxAuctionsCalldata: build_config_getMaxAuctions_calldata,
      getMaxAuctionsFromBid: config_getMaxAuctionsFromBid,
      buildGetMaxAuctionsFromBidCalldata:
        build_config_getMaxAuctionsFromBid_calldata,
      getMaxCircles: config_getMaxCircles,
      buildGetMaxCirclesCalldata: build_config_getMaxCircles_calldata,
      getMinAuctionPrice: config_getMinAuctionPrice,
      buildGetMinAuctionPriceCalldata: build_config_getMinAuctionPrice_calldata,
      getMinAuctionPriceMultiplier: config_getMinAuctionPriceMultiplier,
      buildGetMinAuctionPriceMultiplierCalldata:
        build_config_getMinAuctionPriceMultiplier_calldata,
      getPriceDecreaseRate: config_getPriceDecreaseRate,
      buildGetPriceDecreaseRateCalldata:
        build_config_getPriceDecreaseRate_calldata,
      getRateDenominator: config_getRateDenominator,
      buildGetRateDenominatorCalldata: build_config_getRateDenominator_calldata,
      getScalingFactor: config_getScalingFactor,
      buildGetScalingFactorCalldata: build_config_getScalingFactor_calldata,
      getTaxRate: config_getTaxRate,
      buildGetTaxRateCalldata: build_config_getTaxRate_calldata,
      getTimeSpeed: config_getTimeSpeed,
      buildGetTimeSpeedCalldata: build_config_getTimeSpeed_calldata,
      setAuctionDuration: config_setAuctionDuration,
      buildSetAuctionDurationCalldata: build_config_setAuctionDuration_calldata,
      setBaseTime: config_setBaseTime,
      buildSetBaseTimeCalldata: build_config_setBaseTime_calldata,
      setBuyFee: config_setBuyFee,
      buildSetBuyFeeCalldata: build_config_setBuyFee_calldata,
      setCenterLocation: config_setCenterLocation,
      buildSetCenterLocationCalldata: build_config_setCenterLocation_calldata,
      setClaimFee: config_setClaimFee,
      buildSetClaimFeeCalldata: build_config_setClaimFee_calldata,
      setClaimFeeThreshold: config_setClaimFeeThreshold,
      buildSetClaimFeeThresholdCalldata:
        build_config_setClaimFeeThreshold_calldata,
      setDecayRate: config_setDecayRate,
      buildSetDecayRateCalldata: build_config_setDecayRate_calldata,
      setDropRate: config_setDropRate,
      buildSetDropRateCalldata: build_config_setDropRate_calldata,
      setFloorPrice: config_setFloorPrice,
      buildSetFloorPriceCalldata: build_config_setFloorPrice_calldata,
      setFullConfig: config_setFullConfig,
      buildSetFullConfigCalldata: build_config_setFullConfig_calldata,
      setGridWidth: config_setGridWidth,
      buildSetGridWidthCalldata: build_config_setGridWidth_calldata,
      setLinearDecayTime: config_setLinearDecayTime,
      buildSetLinearDecayTimeCalldata: build_config_setLinearDecayTime_calldata,
      setLiquiditySafetyMultiplier: config_setLiquiditySafetyMultiplier,
      buildSetLiquiditySafetyMultiplierCalldata:
        build_config_setLiquiditySafetyMultiplier_calldata,
      setMainCurrency: config_setMainCurrency,
      buildSetMainCurrencyCalldata: build_config_setMainCurrency_calldata,
      setMaxAuctions: config_setMaxAuctions,
      buildSetMaxAuctionsCalldata: build_config_setMaxAuctions_calldata,
      setMaxAuctionsFromBid: config_setMaxAuctionsFromBid,
      buildSetMaxAuctionsFromBidCalldata:
        build_config_setMaxAuctionsFromBid_calldata,
      setMaxCircles: config_setMaxCircles,
      buildSetMaxCirclesCalldata: build_config_setMaxCircles_calldata,
      setMinAuctionPrice: config_setMinAuctionPrice,
      buildSetMinAuctionPriceCalldata: build_config_setMinAuctionPrice_calldata,
      setMinAuctionPriceMultiplier: config_setMinAuctionPriceMultiplier,
      buildSetMinAuctionPriceMultiplierCalldata:
        build_config_setMinAuctionPriceMultiplier_calldata,
      setOurContractForAuction: config_setOurContractForAuction,
      buildSetOurContractForAuctionCalldata:
        build_config_setOurContractForAuction_calldata,
      setOurContractForFee: config_setOurContractForFee,
      buildSetOurContractForFeeCalldata:
        build_config_setOurContractForFee_calldata,
      setPriceDecreaseRate: config_setPriceDecreaseRate,
      buildSetPriceDecreaseRateCalldata:
        build_config_setPriceDecreaseRate_calldata,
      setRateDenominator: config_setRateDenominator,
      buildSetRateDenominatorCalldata: build_config_setRateDenominator_calldata,
      setScalingFactor: config_setScalingFactor,
      buildSetScalingFactorCalldata: build_config_setScalingFactor_calldata,
      setTaxRate: config_setTaxRate,
      buildSetTaxRateCalldata: build_config_setTaxRate_calldata,
      setTimeSpeed: config_setTimeSpeed,
      buildSetTimeSpeedCalldata: build_config_setTimeSpeed_calldata,
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
