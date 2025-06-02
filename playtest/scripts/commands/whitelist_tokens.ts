import { file } from "bun";
import { Configuration } from "../env";
import {
  connect,
  doTransaction,
  getContractAddress,
  setAccess,
  Token,
} from "../utils";
import { Call } from "starknet";

export async function registerTokens(config: Configuration, args: string[]) {
  console.log("Setting up wallet...");

  await connect(config);

  // Get the tokens
  const data = await file(
    `${config.basePath}/tokens.${config.environment}.json`,
  ).json();

  const calls: Call[] = [];

  for (const token of data.tokens) {
    calls.push({
      contractAddress: await getContractAddress("token_registry"),
      entrypoint: "register_token",
      calldata: [token.address],
    });
  }

  await doTransaction(calls);
}
