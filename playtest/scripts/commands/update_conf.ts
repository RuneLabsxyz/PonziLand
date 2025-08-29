import { $, file, write } from "bun";
import { Configuration } from "../env";
import { COLORS, connect } from "../utils";
import { Contract, type Call } from "starknet";
import { doTransaction } from "../utils";
import fs from "fs/promises";

interface ConfigData {
  tax_rate: string;
  base_time: string;
  price_decrease_rate: string;
  time_speed: string;
  max_auctions: string;
  max_auctions_from_bid: string;
  decay_rate: string;
  floor_price: string;
  liquidity_safety_multiplier: string;
  min_auction_price: string;
  min_auction_price_multiplier: string;
  auction_duration: string;
  scaling_factor: string;
  linear_decay_time: string;
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
      
      // Create a BigInt-safe replacer function
      const bigIntReplacer = (key: string, value: any) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      };

      const manifestPath = `${config.basePath}/deployments/${config.deploymentName}/manifest.json`;
      const manifest = await file(manifestPath).json();
      // Find the config contract
      const configContract = manifest.contracts.find(c => c.tag.includes('config'));
      
      let tokenPath = `${config.basePath}/deployments/${config.deploymentName}/tokens.json`;
      let tokens = await file(tokenPath).json();
      console.log(tokens);

      let call: Call = {
        contractAddress: configContract.address,
        entrypoint: 'set_full_config',
        calldata: [
          fileConfig.tax_rate,
          fileConfig.base_time,
          fileConfig.price_decrease_rate,
          fileConfig.time_speed,
          fileConfig.max_auctions,
          fileConfig.max_auctions_from_bid,
          fileConfig.decay_rate,
          fileConfig.floor_price, 0,
          fileConfig.liquidity_safety_multiplier,
          fileConfig.min_auction_price, 0,
          fileConfig.min_auction_price_multiplier,
          fileConfig.auction_duration,
          fileConfig.scaling_factor,
          fileConfig.linear_decay_time,
          fileConfig.drop_rate,
          fileConfig.rate_denominator,
          fileConfig.max_circles,
          fileConfig.claim_fee,
          fileConfig.buy_fee,
          fileConfig.our_contract_for_fee,
          fileConfig.our_contract_for_auction,
          fileConfig.claim_fee_threshold,
          tokens.tokens[0].address,
        ]
      }
      doTransaction(call);
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
    
    // Use safe logging for objects that might contain BigInt
    console.log("Onchain config:", safeJsonStringify(onchainConfig));
    return onchainConfig;
  } catch (error) {
    console.log(`${COLORS.red}❌ Error reading from contract: ${error}${COLORS.reset}`);
    throw error;
  }

}

// Helper function to recursively normalize objects for JSON serialization
function normalizeObjectForJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeObjectForJson(item));
  }
  
  if (typeof obj === 'object') {
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      normalized[key] = normalizeObjectForJson(value);
    }
    return normalized;
  }
  
  return obj;
}

// Helper function for BigInt-safe JSON.stringify
function safeJsonStringify(obj: any): string {
  const bigIntReplacer = (key: string, value: any) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  };
  
  return JSON.stringify(obj, bigIntReplacer);
}

function compareConfigs(fileConfig: ConfigData, contractConfig: ConfigData): ConfigDifference[] {
  const differences: ConfigDifference[] = [];

  // Fields to ignore during comparison
  const ignoredFields: Set<keyof ConfigData> = new Set(['Symbols', 'Names']);

  // Loop through all fields and treat them as arrays, but skip ignored fields
  for (const field of Object.keys(fileConfig) as (keyof ConfigData)[]) {
    // Skip ignored fields
    if (ignoredFields.has(field)) {
      continue;
    }
    const fileValue = fileConfig[field];
    const contractValue = contractConfig[field];
    
    // Convert BigInt values to strings to avoid JSON.stringify issues
    const normalizeValue = (value: any) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (Array.isArray(value)) {
        return value.map(v => typeof v === 'bigint' ? v.toString() : v);
      }
      return value;
    };
    
    const normalizedFileValue = normalizeValue(fileValue);
    const normalizedContractValue = normalizeValue(contractValue);
    
    const fileArray = Array.isArray(normalizedFileValue) ? normalizedFileValue : [normalizedFileValue];
    const contractArray = Array.isArray(normalizedContractValue) ? normalizedContractValue : [normalizedContractValue];
    
    if (safeJsonStringify(fileArray) !== safeJsonStringify(contractArray)) {
      differences.push({
        field,
        fileValue: Array.isArray(fileValue) ? safeJsonStringify(normalizedFileValue) : normalizedFileValue?.toString() || 'undefined',
        contractValue: Array.isArray(contractValue) ? safeJsonStringify(normalizedContractValue) : normalizedContractValue?.toString() || 'undefined'
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

}
