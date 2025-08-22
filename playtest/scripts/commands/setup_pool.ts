import { file } from "bun";
import { Configuration } from "../env";
import { connect, doTransaction, Token } from "../utils";
import { Account, cairo, Call, CallData } from "starknet";
import { env } from "process";
import { Dir } from "fs";
import BigNumber from "bignumber.js";

BigNumber.config({ EXPONENTIAL_AT: [-40, 40] });

const defaultPool = {
  name: "1% / 2%",
  tickSpacing: 19802,
  fee: "3402823669209384634633746074317682114",
};

export async function setupPool(config: Configuration, args: string[]) {
  // First of all, register all tokens
  const { tokens } = (await file(
    `${config.basePath}/tokens.${config.environment}.json`,
  ).json()) as {
    tokens: Token[];
  };




  const { account } = await connect(config);

  for (const token of tokens) {
    for (const token2 of tokens) {
      if (token.address === token2.address) {
        continue;
      }
      await createPool(config, account, token, token2);
    }
  }

}

async function registerTokens(
  config: Configuration,
  account: Account,
  tokens: Token[],
) {
  // Register tokens here
  const discoveryContract = env.EKUBO_DISCOVERY_CONTRACT!;
  const calls = tokens.flatMap((token) => {
    return [
      {
        contractAddress: token.address,
        entrypoint: "mint",
        calldata: CallData.compile({
          recipient: account.address,
          amount: cairo.uint256(BigNumber(1).shiftedBy(18).toFixed(0)),
        }),
      },
      {
        contractAddress: token.address,
        entrypoint: "transfer",
        calldata: CallData.compile({
          recipient: discoveryContract,
          amount: cairo.uint256(BigNumber(1).shiftedBy(18).toFixed(0)),
        }),
      },
      {
        contractAddress: discoveryContract,
        entrypoint: "register_token",
        calldata: [token.address],
      },
    ] satisfies Call[];
  });

  await doTransaction(calls);
}


async function createPool(
  config: Configuration,
  account: Account,
  token_1: Token,
  token_2: Token,
) {
  // Register tokens here
  const discoveryContract = env.EKUBO_DISCOVERY_CONTRACT!;
  const calls = [
    {
      contractAddress: token_1.address,
      entrypoint: "mint",
      calldata: CallData.compile({
        recipient: account.address,
        amount: cairo.uint256(BigNumber(1000).shiftedBy(18).toFixed(0)),
      }),
    },
    {
      contractAddress: token_2.address,
      entrypoint: "mint",
      calldata: CallData.compile({
        recipient: account.address,
        amount: cairo.uint256(BigNumber(1000).shiftedBy(18).toFixed(0)),
      }),
    },
      {
        contractAddress: "0x0444a09d96389aa7148f1aada508e30b71299ffe650d9c97fdaae38cb9a23384",
        entrypoint: "maybe_initialize_pool",
        calldata: CallData.compile({
          token_1: token_1.address,
          token_2: token_2.address,
          fee: "0x20c49ba5e353f80000000000000000",
          tick_spacing: "0x3e8",
          extension: 0,
          initial_tick_mag: 0,
          initial_tick_sign: 0,
        }),
      },
      {
        contractAddress: token_1.address,
        entrypoint: "transfer",
        calldata: CallData.compile({
          recipient: "0x06a2aee84bb0ed5dded4384ddd0e40e9c1372b818668375ab8e3ec08807417e5",
          amount: cairo.uint256(BigNumber(10).shiftedBy(18).toFixed(0)),
        }),
      },
      {
        contractAddress: token_2.address,
        entrypoint: "transfer",
        calldata: CallData.compile({
          recipient: "0x06a2aee84bb0ed5dded4384ddd0e40e9c1372b818668375ab8e3ec08807417e5",
          amount: cairo.uint256(BigNumber(10).shiftedBy(18).toFixed(0)),
        }),
      },
      {
        contractAddress: "0x06a2aee84bb0ed5dded4384ddd0e40e9c1372b818668375ab8e3ec08807417e5",
        entrypoint: "mint_and_deposit",
        calldata: CallData.compile({
          token_1: token_1.address,
          token_2: token_2.address,
          fee: "0x20c49ba5e353f80000000000000000",
          tick_spacing: "0x3e8",
          extension: 0,
          bounds_lower_mag: "0x3e80",
          bounds_lower_sign: "0x1",
          bounds_upper_mag: "0x3e80",
          bounds_upper_sign: "0x0",
          min_liquidity: "0x40041bc5ff1a9c3949"
        }),
      },
      {
        contractAddress: "0x06a2aee84bb0ed5dded4384ddd0e40e9c1372b818668375ab8e3ec08807417e5",
        entrypoint: "clear",
        calldata: CallData.compile({
          token: token_1.address,
        }),
      },
      {
        contractAddress: "0x06a2aee84bb0ed5dded4384ddd0e40e9c1372b818668375ab8e3ec08807417e5",
        entrypoint: "clear",
        calldata: CallData.compile({
          token: token_2.address,
        }),
      }
    ] satisfies Call[];

  await doTransaction(calls);

  console.log(`Pool created for ${token_1.symbol} and ${token_2.symbol}`);
}