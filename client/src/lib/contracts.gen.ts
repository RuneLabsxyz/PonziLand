import { DojoProvider } from "@dojoengine/core";
import { Account } from "starknet";

export async function setupWorld(provider: DojoProvider) {

	const actions_buy = async (snAccount: Account, liquidityPool: string, tokenForSale: string, sellPrice: number, locationLand: number, amountToStake: number) => {
		try {
			return await provider.execute(
				snAccount,
				{
					contractName: "actions",
					entrypoint: "buy",
					calldata: [liquidityPool, tokenForSale, sellPrice, locationLand, amountToStake],
				},
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
		}
	};

	const actions_claim = async (snAccount: Account) => {
		try {
			return await provider.execute(
				snAccount,
				{
					contractName: "actions",
					entrypoint: "claim",
					calldata: [],
				},
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
		}
	};

	const actions_nuke = async (snAccount: Account) => {
		try {
			return await provider.execute(
				snAccount,
				{
					contractName: "actions",
					entrypoint: "nuke",
					calldata: [],
				},
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
		}
	};

	const actions_bid = async (snAccount: Account) => {
		try {
			return await provider.execute(
				snAccount,
				{
					contractName: "actions",
					entrypoint: "bid",
					calldata: [],
				},
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
		}
	};

	const actions_getStakeBalance = async (snAccount: Account, staker: string) => {
		try {
			return await provider.execute(
				snAccount,
				{
					contractName: "actions",
					entrypoint: "get_stake_balance",
					calldata: [staker],
				},
				"ponzi_land",
			);
		} catch (error) {
			console.error(error);
		}
	};

	return {
		actions: {
			buy: actions_buy,
			claim: actions_claim,
			nuke: actions_nuke,
			bid: actions_bid,
			getStakeBalance: actions_getStakeBalance,
		},
	};
}