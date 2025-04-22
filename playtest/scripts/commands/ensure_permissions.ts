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
  const multicall = await Promise.all(
    data.tokens.map(async (token: Token) => {
      console.log(`Ensuring ${token.name} is mintable... (${token.address})`);
      return await setAccess(token.address, granterAddress, "Minter");
    }),
  );

  const calls = [
    {
      contractAddress: await getContractAddress("auth"),
      entrypoint: "add_verifier",
      calldata: [socialinkAddress],
    },
    ...multicall,
    await setAccess(granterAddress, socialinkAddress, "Minter"),
  ];

  await doTransaction(calls);
}
