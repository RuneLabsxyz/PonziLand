import { $, file, write } from "bun";
import { Configuration } from "../env";
import { COLORS, connect, doTransaction, Token, TokenCreation } from "../utils";
import { byteArray, cairo, Calldata, CallData, Call } from "starknet";
import fs from "fs/promises";

export async function upgradeTokens(config: Configuration, args: string[]) {
  // Compile the project (if no target directory)
  if ((await fs.exists(`${config.basePath}/target/dev`)) == false) {
    console.log(`${COLORS.blue}🔨 Building project...${COLORS.reset}`);
    const result = await $`scarb build`;
    console.log(
      `${COLORS.green}✅ Project built successfully! ${COLORS.reset}`,
    );
  } else {
    console.log(
      `${COLORS.gray} Skipping build because target directory already exists...`,
    );
  }

  // As always, setup the ledger (we are going to need it to declare the class)
  const { account, provider } = await connect(config);
  console.log(
    `${COLORS.blue}💌 Deploying contract class (if not already deployed)...${COLORS.reset}`,
  );

  let contractClass = await file(
    `${config.basePath}/target/dev/testerc20_testerc20_PlayTestToken.contract_class.json`,
  ).json();

  let casm = await file(
    `${config.basePath}/target/dev/testerc20_testerc20_PlayTestToken.compiled_contract_class.json`,
  ).json();

  const { transaction_hash: txHash, class_hash } = await account.declareIfNot(
    {
      contract: contractClass,
      casm: casm,
    },
    { version: 3 },
  );
  if (txHash != null && txHash != "") {
    await provider.waitForTransaction(txHash);
  }

  console.log(
    `${COLORS.green}✅ Contract class declared at ${COLORS.gray}${class_hash}${COLORS.green} ! ${COLORS.reset}`,
  );

  // Prepare the TX to upgrade all tokens at the same time
  const tokens = await file(
    `${config.basePath}/tokens.${config.environment}.json`,
  ).json();

  const upgradeCalls = tokens.tokens.map(
    (token: Token) =>
      ({
        contractAddress: token.address,
        entrypoint: "upgrade",
        calldata: CallData.compile({
          new_class_hash: class_hash,
        }),
      }) satisfies Call,
  );

  await doTransaction(upgradeCalls);
}
