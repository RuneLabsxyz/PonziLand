import { file } from "bun";
import { Configuration } from "../env";
import {
  connect,
  doTransaction,
  getContractAddress,
  setAccess,
  Token,
} from "../utils";

export async function ensurePermissions(config: Configuration, args: string[]) {
  console.log("Setting up wallet...");

  await connect(config);

  // Get the tokens
  const data = await file(
    `${config.basePath}/tokens.${config.environment}.json`,
  ).json();

  const socialinkAddress = data.socialinkAccount;
  const granterAddress = data.tokenGranterAddress;

  console.log("=== Ensuring that tokens are mintable");
  const skipTokens = args.includes("--skip-tokens");

  console.log("Skip tokens:", skipTokens);

  const multicall = await Promise.all(
    data.tokens.map(async (token: Token) => {
      return await setAccess(token.address, granterAddress, "Minter");
    }),
  );

  multicall.push(await setAccess(granterAddress, socialinkAddress, "Minter"));

  const calls = [
    /*{
      contractAddress: await getContractAddress("auth"),
      entrypoint: "add_verifier",
      calldata: [socialinkAddress],
    },*/
    ...(skipTokens ? [] : multicall),
  ];

  await doTransaction(calls);
}
