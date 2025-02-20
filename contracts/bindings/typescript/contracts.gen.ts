import { DojoProvider, DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, BigNumberish, CairoOption, CairoCustomEnum, ByteArray } from "starknet";
import * as models from "./models.gen";

export function setupWorld(provider: DojoProvider) {

	const build_actions_auction_calldata = (landLocation: BigNumberish, startPrice: BigNumberish, floorPrice: BigNumberish, decayRate: BigNumberish, isFromNuke: boolean): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "auction",
			calldata: [landLocation, startPrice, floorPrice, decayRate, isFromNuke],
		};
	};

	const actions_auction = async (snAccount: Account | AccountInterface, landLocation: BigNumberish, startPrice: BigNumberish, floorPrice: BigNumberish, decayRate: BigNumberish, isFromNuke: boolean) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_auction_calldata(landLocation, startPrice, floorPrice, decayRate, isFromNuke),
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_bid_calldata = (landLocation: BigNumberish, tokenForSale: string, sellPrice: BigNumberish, amountToStake: BigNumberish, liquidityPool: models.PoolKey): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "bid",
			calldata: [landLocation, tokenForSale, sellPrice, amountToStake, liquidityPool],
		};
	};

	const actions_bid = async (snAccount: Account | AccountInterface, landLocation: BigNumberish, tokenForSale: string, sellPrice: BigNumberish, amountToStake: BigNumberish, liquidityPool: models.PoolKey) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_bid_calldata(landLocation, tokenForSale, sellPrice, amountToStake, liquidityPool),
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_buy_calldata = (landLocation: BigNumberish, tokenForSale: string, sellPrice: BigNumberish, amountToStake: BigNumberish, liquidityPool: models.PoolKey): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "buy",
			calldata: [landLocation, tokenForSale, sellPrice, amountToStake, liquidityPool],
		};
	};

	const actions_buy = async (snAccount: Account | AccountInterface, landLocation: BigNumberish, tokenForSale: string, sellPrice: BigNumberish, amountToStake: BigNumberish, liquidityPool: models.PoolKey) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_buy_calldata(landLocation, tokenForSale, sellPrice, amountToStake, liquidityPool),
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_claim_calldata = (landLocation: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "claim",
			calldata: [landLocation],
		};
	};

	const actions_claim = async (snAccount: Account | AccountInterface, landLocation: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_claim_calldata(landLocation),
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_getActiveAuctions_calldata = (): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "get_active_auctions",
			calldata: [],
		};
	};

	const actions_getActiveAuctions = async () => {
		try {
			return await provider.call("ponzi_land", build_actions_getActiveAuctions_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_getAuction_calldata = (landLocation: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "get_auction",
			calldata: [landLocation],
		};
	};

	const actions_getAuction = async (landLocation: BigNumberish) => {
		try {
			return await provider.call("ponzi_land", build_actions_getAuction_calldata(landLocation));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_getCurrentAuctionPrice_calldata = (landLocation: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "get_current_auction_price",
			calldata: [landLocation],
		};
	};

	const actions_getCurrentAuctionPrice = async (landLocation: BigNumberish) => {
		try {
			return await provider.call("ponzi_land", build_actions_getCurrentAuctionPrice_calldata(landLocation));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_getLand_calldata = (landLocation: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "get_land",
			calldata: [landLocation],
		};
	};

	const actions_getLand = async (landLocation: BigNumberish) => {
		try {
			return await provider.call("ponzi_land", build_actions_getLand_calldata(landLocation));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_getNeighborsYield_calldata = (landLocation: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "get_neighbors_yield",
			calldata: [landLocation],
		};
	};

	const actions_getNeighborsYield = async (landLocation: BigNumberish) => {
		try {
			return await provider.call("ponzi_land", build_actions_getNeighborsYield_calldata(landLocation));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_getNextClaimInfo_calldata = (landLocation: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "get_next_claim_info",
			calldata: [landLocation],
		};
	};

	const actions_getNextClaimInfo = async (landLocation: BigNumberish) => {
		try {
			return await provider.call("ponzi_land", build_actions_getNextClaimInfo_calldata(landLocation));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_getPendingTaxesForLand_calldata = (landLocation: BigNumberish, ownerLand: string): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "get_pending_taxes_for_land",
			calldata: [landLocation, ownerLand],
		};
	};

	const actions_getPendingTaxesForLand = async (landLocation: BigNumberish, ownerLand: string) => {
		try {
			return await provider.call("ponzi_land", build_actions_getPendingTaxesForLand_calldata(landLocation, ownerLand));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_increasePrice_calldata = (landLocation: BigNumberish, newPrice: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "increase_price",
			calldata: [landLocation, newPrice],
		};
	};

	const actions_increasePrice = async (snAccount: Account | AccountInterface, landLocation: BigNumberish, newPrice: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_increasePrice_calldata(landLocation, newPrice),
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_increaseStake_calldata = (landLocation: BigNumberish, amountToStake: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "increase_stake",
			calldata: [landLocation, amountToStake],
		};
	};

	const actions_increaseStake = async (snAccount: Account | AccountInterface, landLocation: BigNumberish, amountToStake: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_increaseStake_calldata(landLocation, amountToStake),
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_levelUp_calldata = (landLocation: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "level_up",
			calldata: [landLocation],
		};
	};

	const actions_levelUp = async (snAccount: Account | AccountInterface, landLocation: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_levelUp_calldata(landLocation),
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_actions_nuke_calldata = (landLocation: BigNumberish): DojoCall => {
		return {
			contractName: "actions",
			entrypoint: "nuke",
			calldata: [landLocation],
		};
	};

	const actions_nuke = async (snAccount: Account | AccountInterface, landLocation: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_actions_nuke_calldata(landLocation),
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};



	return {
		actions: {
			auction: actions_auction,
			buildAuctionCalldata: build_actions_auction_calldata,
			bid: actions_bid,
			buildBidCalldata: build_actions_bid_calldata,
			buy: actions_buy,
			buildBuyCalldata: build_actions_buy_calldata,
			claim: actions_claim,
			buildClaimCalldata: build_actions_claim_calldata,
			getActiveAuctions: actions_getActiveAuctions,
			buildGetActiveAuctionsCalldata: build_actions_getActiveAuctions_calldata,
			getAuction: actions_getAuction,
			buildGetAuctionCalldata: build_actions_getAuction_calldata,
			getCurrentAuctionPrice: actions_getCurrentAuctionPrice,
			buildGetCurrentAuctionPriceCalldata: build_actions_getCurrentAuctionPrice_calldata,
			getLand: actions_getLand,
			buildGetLandCalldata: build_actions_getLand_calldata,
			getNeighborsYield: actions_getNeighborsYield,
			buildGetNeighborsYieldCalldata: build_actions_getNeighborsYield_calldata,
			getNextClaimInfo: actions_getNextClaimInfo,
			buildGetNextClaimInfoCalldata: build_actions_getNextClaimInfo_calldata,
			getPendingTaxesForLand: actions_getPendingTaxesForLand,
			buildGetPendingTaxesForLandCalldata: build_actions_getPendingTaxesForLand_calldata,
			increasePrice: actions_increasePrice,
			buildIncreasePriceCalldata: build_actions_increasePrice_calldata,
			increaseStake: actions_increaseStake,
			buildIncreaseStakeCalldata: build_actions_increaseStake_calldata,
			levelUp: actions_levelUp,
			buildLevelUpCalldata: build_actions_levelUp_calldata,
			nuke: actions_nuke,
			buildNukeCalldata: build_actions_nuke_calldata,
		},
	};
}