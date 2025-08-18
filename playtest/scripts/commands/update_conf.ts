import { $, file, write } from "bun";
import { Configuration } from "../env";
import { COLORS, connect } from "../utils";
import { Contract } from "starknet";
import fs from "fs/promises";

interface ConfigData {
  tax_rate: string;
  base_time: string;
  price_decrease_rate: string;
  time_speed: string;
  max_auctions: string;
  max_auctions_from_bid: string;
  decay_rate: string;
  "floor price": string;
  liquidity_safety_multiplier: string;
  min_auction_price: string;
  min_auction_price_multiplier: string;
  auction_duration: string;
  scaling_factor: string;
  linear_time_decay: string;
  drop_rate: string;
  rate_denominator: string;
  max_circles: string;
  claim_fee: string;
  buy_fee: string;
  our_contract_for_fee: string;
  our_contract_for_auction: string;
  claim_fee_threshold: string;
  Symbols: string[];
  Names: string[];
}

interface ConfigDifference {
  field: string;
  fileValue: string;
  contractValue: string;
}

export async function updateConfig(config: Configuration, args: string[]) {
  if (args.length !== 1) {
    console.log("Required arguments: update-config [path-to-consts.json]");
    console.log("Example: update-config ../../consts.json");
    return;
  }

  const [constsPath] = args;

  // Check if consts.json file exists
  if (!(await fs.exists(constsPath))) {
    console.log(`${COLORS.red}❌ Error: consts.json file not found at ${constsPath}${COLORS.reset}`);
    return;
  }

  console.log(`${COLORS.blue}🔍 Reading configuration from ${constsPath}...${COLORS.reset}`);

  try {
    // Read the consts.json file
    const fileConfig: ConfigData = await file(constsPath).json();
    console.log(`${COLORS.green}✅ Configuration file loaded successfully${COLORS.reset}`);

    // Setup connection to read from contracts
    const { account, provider } = await connect(config);
    console.log(`${COLORS.blue}🌐 Connected to network: ${config.rpcUrl}${COLORS.reset}`);

    // Read configuration from contracts
    console.log(`${COLORS.blue}📖 Reading configuration from deployed contracts...${COLORS.reset}`);
    const contractConfig = await readContractConfig(config, provider);

    // Compare configurations
    console.log(`${COLORS.blue}🔍 Comparing file configuration with on-chain configuration...${COLORS.reset}`);
    const differences = compareConfigs(fileConfig, contractConfig);

    // Display results
    displayComparisonResults(differences);

    // Optionally write differences to a file
    if (differences.length > 0) {
      const differencesPath = `${config.basePath}/deployments/${config.deploymentName}/config_differences.json`;
      await write(differencesPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        differences: differences,
        fileConfig: fileConfig,
        contractConfig: contractConfig
      }, null, 2));
      console.log(`${COLORS.gray}📝 Differences saved to ${differencesPath}${COLORS.reset}`);
    }

  } catch (error) {
    console.log(`${COLORS.red}❌ Error processing configuration: ${error}${COLORS.reset}`);
  }
}

async function readContractConfig(config: Configuration, provider: any): Promise<ConfigData> {
  console.log(`${COLORS.gray}🔧 [PLACEHOLDER] Reading config from contract...${COLORS.reset}`);
  
  // PLACEHOLDER: This would read from the actual deployed contracts
  // For now, return mock data to demonstrate the structure
  
  // TODO: Implement actual contract reading logic
  // Example of what this would look like:
  try {
    // Get contract ABI and address from manifest or deployment files
    const manifestPath = `${config.basePath}/deployments/${config.deploymentName}/manifest.json`;
    const manifest = await file(manifestPath).json();
    // Find the config contract
    const configContract = manifest.contracts.find(c => c.tag.includes('config'));
    
    // Create contract instance
    const contract = new Contract(configContract.abi, configContract.address, provider);
    
    const onchainConfig = await contract.get_config();
    
    console.log(onchainConfig);
    return onchainConfig;
  } catch (error) {
    console.log(`${COLORS.red}❌ Error reading from contract: ${error}${COLORS.reset}`);
    throw error;
  }

}

function compareConfigs(fileConfig: ConfigData, contractConfig: ConfigData): ConfigDifference[] {
  const differences: ConfigDifference[] = [];

  // Loop through all fields in the fileConfig
  for (const field of Object.keys(fileConfig) as (keyof ConfigData)[]) {
    const fileValue = fileConfig[field];
    const contractValue = contractConfig[field];

    // Handle array fields
    if (Array.isArray(fileValue) && Array.isArray(contractValue)) {
      if (JSON.stringify(fileValue) !== JSON.stringify(contractValue)) {
        differences.push({
          field,
          fileValue: JSON.stringify(fileValue),
          contractValue: JSON.stringify(contractValue)
        });
      }
    }
    // Handle string fields
    else if (typeof fileValue === 'string' && typeof contractValue === 'string') {
      if (fileValue.toString() !== contractValue.toString()) {
        differences.push({
          field,
          fileValue: fileValue || 'undefined',
          contractValue: contractValue || 'undefined'
        });
      }
    }
    // Handle undefined/missing fields
    else if (fileValue.toString() !== contractValue.toString()) {
      differences.push({
        field,
        fileValue: fileValue ? (Array.isArray(fileValue) ? JSON.stringify(fileValue) : fileValue.toString()) : 'undefined',
        contractValue: contractValue ? (Array.isArray(contractValue) ? JSON.stringify(contractValue) : contractValue.toString()) : 'undefined'
      });
    }
  }

  return differences;
}

function displayComparisonResults(differences: ConfigDifference[]) {
  console.log(`\n${COLORS.blue}📊 Configuration Comparison Results${COLORS.reset}`);
  console.log("=".repeat(50));

  if (differences.length === 0) {
    console.log(`${COLORS.green}✅ All configurations match! No differences found.${COLORS.reset}`);
    return;
  }

  console.log(`${COLORS.yellow}⚠️  Found ${differences.length} difference(s):${COLORS.reset}\n`);

  for (const diff of differences) {
    console.log(`${COLORS.red}❌ ${diff.field}:${COLORS.reset}`);
    console.log(`   File:     ${COLORS.gray}${diff.fileValue}${COLORS.reset}`);
    console.log(`   Contract: ${COLORS.gray}${diff.contractValue}${COLORS.reset}`);
    console.log("");
  }

  console.log(`${COLORS.blue}💡 Tip: Use the differences file to understand what needs to be updated.${COLORS.reset}`);
}
