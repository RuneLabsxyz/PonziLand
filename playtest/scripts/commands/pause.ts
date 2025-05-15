import { file } from "bun";
import { Configuration } from "../env";
import { connect, doTransaction, getContractAddress, Token } from "../utils";
import { Call, CallData } from "starknet";

export async function pauseGame(config: Configuration, args: string[]) {
  // As always, setup the ledger (we are going to need it to declare the class)
  const { account, provider } = await connect(config);

  // Prepare the TX to upgrade all tokens at the same time
  const tokens = await file(
    `${config.basePath}/tokens.${config.environment}.json`,
  ).json();

  const pauseCalls = tokens.tokens.map(
    (token: Token) =>
      ({
        contractAddress: token.address,
        entrypoint: "pause",
        calldata: [],
      }) satisfies Call,
  );

  await doTransaction([
    {
      contractAddress: await getContractAddress("auth"),
      entrypoint: "lock_actions",
      calldata: [],
    },
    ...pauseCalls,
  ]);
}
