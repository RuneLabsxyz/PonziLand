import { $, file, write } from "bun";
import { Configuration } from "../env";
import { COLORS, connect, Token, TokenCreation } from "../utils";
import { byteArray, cairo, Calldata, CallData, Contract, type shortString } from "starknet";
import fs from "fs/promises";

export async function  deployToken(config: Configuration, args: string[]) {
  if (args.length != 2) {
    console.log("Required arguments: deploy [symbol] [name]");
    return;
  }

  const [symbol, name] = args;

  // Check if token already exists
  const tokensPath = `${config.basePath}/tokens.${config.environment}.json`;
  let existingTokens;
  try {
    existingTokens = await file(tokensPath).json();
  } catch (error) {
    // File doesn't exist, will be created later
    existingTokens = { tokens: [] };
  }
  console.log(existingTokens);

  // Check if token with this symbol already exists
  const existingToken = existingTokens.tokens.find((token: Token) => token.symbol === symbol);
  
  if (existingToken) {
    console.log(`${COLORS.yellow}⚠️  Token with symbol ${symbol} already exists at ${existingToken.address}${COLORS.reset}`);
    console.log(`${COLORS.blue}🔍 Verifying token symbol...${COLORS.reset}`);
    
    // Setup connection to verify the token
    const { account, provider } = await connect(config);
    
    try {
        // Compile the project (if no target directory)
      if ((await fs.exists(`${config.basePath}/old-tokens/target/dev`)) == false) {
        console.log(`${COLORS.blue}🔨 Building project...${COLORS.reset}`);
        const result = await $`cd old-tokens && scarb build && cd ..`;
        console.log(
          `${COLORS.green}✅ Project built successfully! ${COLORS.reset}`,
        );
      } else {
        console.log(
          `${COLORS.gray} Skipping build because target directory already exists...`,
        );
      }

      // Get the contract class to access ABI
      let contractClass = await file(
        `${config.basePath}/old-tokens/target/dev/testerc20_testerc20_PlayTestToken.contract_class.json`,
      ).json();

      // Create contract instance
      const contract = new Contract(contractClass.abi, existingToken.address, provider).typedv2(contractClass.abi);
      
      // Call the symbol function to verify
      const contractSymbol: String = await contract.symbol();
      if (contractSymbol == symbol) {
        console.log(`${COLORS.green}✅ Token ${symbol} already deployed and verified at ${existingToken.address}${COLORS.reset}`);
        return;
      } else {
        console.log(`${COLORS.red}❌ Symbol mismatch! Expected: ${symbol}, Got: ${contractSymbol}${COLORS.reset}`);
        console.log(`${COLORS.blue}🔄 Proceeding with new deployment...${COLORS.reset}`);
      }
    } catch (error) {
      console.log(`${COLORS.red}❌ Error verifying existing token: ${error}${COLORS.reset}`);
      console.log(`${COLORS.blue}🔄 Proceeding with new deployment...${COLORS.reset}`);
    }
  }

  // Compile the project (if no target directory)
  if ((await fs.exists(`${config.basePath}/old-tokens/target/dev`)) == false) {
    console.log(`${COLORS.blue}🔨 Building project...${COLORS.reset}`);
    const result = await $`cd old-tokens && scarb build && cd ..`;
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
    `${config.basePath}/old-tokens/target/dev/testerc20_testerc20_PlayTestToken.contract_class.json`,
  ).json();

  let casm = await file(
    `${config.basePath}/old-tokens/target/dev/testerc20_testerc20_PlayTestToken.compiled_contract_class.json`,
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
  const tokensPath = `${config.basePath}/tokens.${config.environment}.json`;

  // Check if file exists, create it if it doesn't
  try {
    await file(tokensPath).json();
  } catch (error) {
    // File doesn't exist, create it with default structure
    console.log(`📝 Creating tokens file: ${tokensPath}`);
    await Bun.write(tokensPath, JSON.stringify({ tokens: [] }, null, 2));
  }

  const tokens = await file(tokensPath).json();

  tokens.tokens.push(token);

  // Save the file
  await write(
    `${config.basePath}/tokens.${config.environment}.json`,
    JSON.stringify(tokens, null, 2),
  );
}
