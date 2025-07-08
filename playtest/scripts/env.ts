// Handle the account + environment depending on the parameters
import { parseArgs } from "util";
import dotenv from "dotenv";
import { Call, RpcProvider } from "starknet";
import { env } from "process";
import { getLedgerAccount, getStarkliAccount } from "./account";
import { exit } from "process";

export type Configuration = {
  rpc: string | undefined;
  environment: string | undefined;
  basePath: string;
  owner: string | undefined;
  forceLedger: boolean;
};

async function getProvider(config: Configuration) {
  return new RpcProvider({
    nodeUrl: config.rpc ?? env.STARKNET_RPC_URL,
    specVersion: "0.8.1",
  });
}

export async function getAccount(config: Configuration) {
  let provider = await getProvider(config);
  console.log(config);

  if (env.STARKNET_KEYSTORE !== undefined && !config.forceLedger) {
    return await getStarkliAccount(provider);
  } else {
    // Use ledger, get the account from the address
    return await getLedgerAccount(provider);
  }
}

export async function getContext(config: Configuration) {
  return {
    provider: await getProvider(config),
    account: await getAccount(config),
  };
}
