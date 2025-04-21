import { $, env, file, color } from "bun";
import manifest from "../../contracts/manifest_sepolia.json";
import holders from "../query-results.json";
import {
  Account,
  CairoCustomEnum,
  Contract,
  RpcProvider,
  constants,
  transaction,
  CairoOption,
  CallData,
  CairoOptionVariant,
  Call,
} from "starknet";
import { ABI } from "./abi";
import { Configuration, getContext } from "./env";

export type Token = {
  name: string;
  symbol: string;
  address: string;
};

export type TokenCreation = Omit<Token, "address">;

export const COLORS = {
  green: color("#80EF80", "ansi"),
  gray: color("gray", "ansi"),
  red: color("#FA5053", "ansi"),
  blue: color("#90D5FF", "ansi"),
  reset: "\u001b[0m",
};

export type Context = {
  provider: RpcProvider;
  account: Account;
  config: Configuration;
};

let context: Context | null = null;

export async function connect(config: Configuration): Promise<Context> {
  console.log(`${COLORS.blue}🔗 Connecting to account...${COLORS.reset}`);
  context = {
    ...(await getContext(config)),
    config,
  };

  console.log(`${COLORS.green}✅ Connected! ${COLORS.reset}`);

  return context!;
}

export async function doTransaction(call: Call | Call[]) {
  console.log(`${COLORS.gray}⏱️ Sending transaction...${COLORS.reset}`);

  try {
    // Compute the tx hash for review.
    const tx = await context!.account.execute(call, { version: 3 });

    console.log(`${COLORS.gray}TX: ${tx.transaction_hash}${COLORS.reset}`);

    await context!.provider.waitForTransaction(tx.transaction_hash);

    console.log(`${COLORS.green}✅ Transaction accepted! ${COLORS.reset}`);
  } catch (error) {
    console.error(`${COLORS.red}❌ Transaction failed! ${COLORS.reset}`);
    console.error(error);
  }
}

export function getContractAddress(contractName: string) {
  const selector = "ponzi_land-" + contractName;
  const contract = manifest.contracts.find((c) => c.tag === selector);
  if (!contract) throw new Error(`Contract ${contractName} not found`);
  return contract.address;
}

export async function forEachToken(
  callback: (token: Token) => Promise<void> | Promise<Call>,
) {
  const multicall: Call[] = [];
  const tokens = await file(
    `./tokens.${context?.config.environment}.json`,
  ).json();
  for (const token of tokens.tokens) {
    const data = await callback(token);
    if (data) {
      multicall.push(data);
    }
  }

  if (multicall.length > 0) {
    await doTransaction(multicall);
  }
}

export async function setAccess(
  contractAddress: string,
  address: string,
  role: string,
) {
  return {
    contractAddress,
    entrypoint: "set_access",
    calldata: CallData.compile({
      address,
      access: new CairoCustomEnum({ [role]: {} }),
    }),
  } satisfies Call;
}

export { ABI };
