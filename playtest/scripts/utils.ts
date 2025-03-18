import { $, env, file, color } from "bun";
import tokens from "../tokens.json";
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
import { exit } from "node:process";

export type Token = (typeof tokens.tokens)[0];

const provider = new RpcProvider({
  nodeUrl: env.STARKNET_RPC,
});

export const COLORS = {
  green: color("#80EF80", "ansi"),
  gray: color("gray", "ansi"),
  red: color("#FA5053", "ansi"),
  blue: color("#90D5FF", "ansi"),
  reset: "\u001b[0m",
};

export const { stdout } =
  await $`starkli signer keystore inspect-private $STARKNET_KEYSTORE --password $STARKNET_KEYSTORE_PASSWORD --raw`.quiet();
const privateKey = stdout.toString().replace("\n", "");

export const address = (
  await file(env.STARKNET_ACCOUNT!.replace("~", env.HOME!)).json()
).deployment.address;

export const account = new Account(
  provider,
  address,
  privateKey,
  undefined,
  constants.TRANSACTION_VERSION.V3,
);

export async function doTransaction(call: Call | Call[]) {
  console.log(`${COLORS.gray}⏱️ Sending transaction...${COLORS.reset}`);

  try {
    const tx = await account.execute(call);
    console.log(`${COLORS.gray}TX: ${tx.transaction_hash}${COLORS.reset}`);

    await provider.waitForTransaction(tx.transaction_hash);

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
