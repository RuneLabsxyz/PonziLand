import { $, file, write } from "bun";
import { Configuration } from "../env";
import { COLORS, connect, Token, TokenCreation } from "../utils";
import { byteArray, cairo, Calldata, CallData } from "starknet";
import fs from "fs/promises";

export async function deployToken(config: Configuration, args: string[]) {
  if (args.length != 2) {
    console.log("Required arguments: deploy [symbol] [name]");
    return;
  }

  const [symbol, name] = args;

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

  console.log(
    `${COLORS.blue}💌 Deploying contract for token ${symbol}...${COLORS.reset}`,
  );

  const contractCallData: CallData = new CallData(contractClass.abi);
  const contractConstructor: Calldata = contractCallData.compile(
    "constructor",
    {
      owner: config.owner ?? account.address,
      name: name,
      symbol: symbol,
    },
  );

  // Deploy using starknet
  let { contract_address, transaction_hash } = await account.deploy(
    {
      classHash: class_hash,
      constructorCalldata: contractConstructor,
    },
    {},
  );

  await provider.waitForTransaction(transaction_hash);

  console.log(
    `${COLORS.blue}✅ Token ${symbol} deployed at: ${contract_address[0]}${COLORS.reset}`,
  );

  await addTokenToFile(config, {
    symbol,
    name,
    address: contract_address[0],
  });
}

async function addTokenToFile(config: Configuration, token: Token) {
  // Read the tokens file
  const tokens = await file(
    `${config.basePath}/tokens.${config.environment}.json`,
  ).json();

  tokens.tokens.push(token);

  // Save the file
  await write(
    `${config.basePath}/tokens.${config.environment}.json`,
    JSON.stringify(tokens, null, 2),
  );
}
