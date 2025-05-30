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

  await registerTokens(config, account, tokens);
}

export function getPoolConfig(tokens: Token[], token: Token) {
  const mainToken = tokens.find(e => e.default == true);
  if (mainToken == null) {
    throw new Error("No default token found");
  }

  if (mainToken == token) {
    return undefined;
  }

  // Else, return the following:
  //
  return {

  } satisfies PoolConfig;
}

export type PoolConfig = {
  mainToken: Token;
  secondaryToken: Token;

  tickSpacing: bigint;
  extension: bigint;
  fee: bigint;

  bounds: {
    lower: {
      mag: bigint;
      sign: boolean;
    };
    upper: {
      mag: bigint;
      sign: boolean;
    };
  };
  min_liquidity: bigint;
};

async function setupEkuboPosition(config: Configuration, account: Account, poolConfig: PoolConfig) {
  // In order:
  // - Mint enough tokens to do the setup to the Account
  // - Transfer the tokens to the position contract: 0x02e0af29598b407c8716b17f6d2795eca1b471413fa03fb145a5e33722184067
  // - mint_and_deposit:
  /*

  [
    {
      "name": "pool_key",
      "type": "ekubo::types::keys::PoolKey",
      "value": "{\n  \"token0\": {\n    \"value\": \"0x415c058a41cc80e7368562564c96fc4e3c03b23e32ba07a5c8cadc262b50c3c\",\n    \"type\": \"core::starknet::contract_address::ContractAddress\"\n  },\n  \"token1\": {\n    \"value\": \"0x5735fa6be5dd248350866644c0a137e571f9d637bb4db6532ddd63a95854b58\",\n    \"type\": \"core::starknet::contract_address::ContractAddress\"\n  },\n  \"fee\": {\n    \"value\": \"0x28f5c28f5c28f5c28f5c28f5c28f5c2\",\n    \"type\": \"core::integer::u128\"\n  },\n  \"tick_spacing\": {\n    \"value\": \"0x4d5a\",\n    \"type\": \"core::integer::u128\"\n  },\n  \"extension\": {\n    \"value\": \"0x0\",\n    \"type\": \"core::starknet::contract_address::ContractAddress\"\n  }\n}"
    },
    {
      "name": "bounds",
      "type": "ekubo::types::bounds::Bounds",
      "value": "{\n  \"lower\": {\n    \"value\": {\n      \"mag\": {\n        \"value\": \"0x235a22\",\n        \"type\": \"core::integer::u128\"\n      },\n      \"sign\": {\n        \"value\": \"0x1\",\n        \"type\": \"core::bool\"\n      }\n    },\n    \"type\": \"ekubo::types::i129::i129\"\n  },\n  \"upper\": {\n    \"value\": {\n      \"mag\": {\n        \"value\": \"0x19aee2\",\n        \"type\": \"core::integer::u128\"\n      },\n      \"sign\": {\n        \"value\": \"0x1\",\n        \"type\": \"core::bool\"\n      }\n    },\n    \"type\": \"ekubo::types::i129::i129\"\n  }\n}"
    },
    {
      "name": "min_liquidity",
      "type": "core::integer::u128",
      "value": "\"0x739c9ba38097c59639e\""
    }
  ]
  */
  const calls = [
    {
    }
  ] satisfies Call[];
  // Clear the tokens in the position contract: 0x04fd8d4e2c73ff8ad0f43c73fe3a26a9e98060539876f0393a41be1bd6021b5e - clear(token)
  // (To get the reminder)
  await registerTokens(config, account, tokens);
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
