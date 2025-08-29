import { file } from "bun";
import { Configuration } from "../env";
import { connect, doTransaction, Token } from "../utils";
import { Account, cairo, Call, CallData } from "starknet";
import { env } from "process";
import { Dir } from "fs";
import BigNumber from "bignumber.js";

BigNumber.config({ EXPONENTIAL_AT: [-40, 40] });

const defaultPool = {
  name: "1% / 2%",
  tickSpacing: 19802,
  fee: "3402823669209384634633746074317682114",
};

interface PoolPair {
  token1: Token;
  token2: Token;
  key: string;
}

interface PoolDeploymentResult {
  pair: PoolPair;
  success: boolean;
  error?: string;
}

export async function setupPool(config: Configuration, args: string[]) {
  // First of all, register all tokens
  const tokensPath = `${config.basePath}/deployments/${config.deploymentName}/tokens.json`;
  const { tokens } = (await file(tokensPath).json()) as {
    tokens: Token[];
  };

  console.log(`\n🚀 Starting pool setup for ${tokens.length} tokens...`);
  console.log(`Tokens: ${tokens.map(t => t.symbol).join(', ')}\n`);

  const { account } = await connect(config);

  // Generate unique pairs (avoiding A,B and B,A duplicates)
  const uniquePairs = generateUniquePairs(tokens);
  console.log(`📊 Generated ${uniquePairs.length} unique token pairs to deploy\n`);

  // Track deployment results
  const deploymentResults: PoolDeploymentResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Deploy pools for each unique pair
  for (let i = 0; i < uniquePairs.length; i++) {
    const pair = uniquePairs[i];
    console.log(`[${i + 1}/${uniquePairs.length}] Creating pool for ${pair.token1.symbol}/${pair.token2.symbol}...`);

    const result = await createPool(config, account, pair.token1, pair.token2);
    
    if (result.success) {
      deploymentResults.push({
        pair,
        success: true
      });
      successCount++;
      console.log(`✅ Successfully created ${pair.token1.symbol}/${pair.token2.symbol} pool`);
    } else {
      deploymentResults.push({
        pair,
        success: false,
        error: result.error
      });
      failureCount++;
      console.log(`❌ Failed to create ${pair.token1.symbol}/${pair.token2.symbol} pool: ${result.error}`);
    }
  }

  // Print final summary
  printDeploymentSummary(deploymentResults, successCount, failureCount);
}

function generateUniquePairs(tokens: Token[]): PoolPair[] {
  const pairs: PoolPair[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      const token1 = tokens[i];
      const token2 = tokens[j];
      
      // Create a deterministic key for the pair (order by address to avoid duplicates)
      const sortedAddresses = [token1.address, token2.address].sort();
      const pairKey = `${sortedAddresses[0]}-${sortedAddresses[1]}`;
      
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        pairs.push({
          token1,
          token2,
          key: pairKey
        });
      }
    }
  }

  return pairs;
}

function printDeploymentSummary(results: PoolDeploymentResult[], successCount: number, failureCount: number) {
  console.log('\n' + '='.repeat(60));
  console.log('📈 POOL DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful deployments: ${successCount}`);
  console.log(`❌ Failed deployments: ${failureCount}`);
  console.log(`📊 Total pairs attempted: ${results.length}\n`);

  if (successCount > 0) {
    console.log('🎉 Successfully deployed pools:');
    results
      .filter(r => r.success)
      .forEach(result => {
        console.log(`  • ${result.pair.token1.symbol}/${result.pair.token2.symbol}`);
      });
    console.log('');
  }

  if (failureCount > 0) {
    console.log('⚠️  Failed pool deployments:');
    results
      .filter(r => !r.success)
      .forEach(result => {
        console.log(`  • ${result.pair.token1.symbol}/${result.pair.token2.symbol}: ${result.error}`);
      });
    console.log('');
  }

  const successRate = ((successCount / results.length) * 100).toFixed(1);
  console.log(`🎯 Overall success rate: ${successRate}%`);
  console.log('='.repeat(60) + '\n');
}

async function registerTokens(
  config: Configuration,
  account: Account,
  tokens: Token[],
) {
  // Register tokens here
  const discoveryContract = env.EKUBO_DISCOVERY_CONTRACT!;
  const calls = tokens.flatMap((token) => {
    return [
      {
        contractAddress: token.address,
        entrypoint: "mint",
        calldata: CallData.compile({
          recipient: account.address,
          amount: cairo.uint256(BigNumber(1).shiftedBy(18).toFixed(0)),
        }),
      },
      {
        contractAddress: token.address,
        entrypoint: "transfer",
        calldata: CallData.compile({
          recipient: discoveryContract,
          amount: cairo.uint256(BigNumber(1).shiftedBy(18).toFixed(0)),
        }),
      },
      {
        contractAddress: discoveryContract,
        entrypoint: "register_token",
        calldata: [token.address],
      },
    ] satisfies Call[];
  });

  await doTransaction(calls);
}


async function createPool(
  config: Configuration,
  account: Account,
  token_1: Token,
  token_2: Token,
) {
  // Register tokens here
  const discoveryContract = env.EKUBO_DISCOVERY_CONTRACT!;
  const calls = [
    {
      contractAddress: token_1.address,
      entrypoint: "mint",
      calldata: CallData.compile({
        recipient: account.address,
        amount: cairo.uint256(BigNumber(1000).shiftedBy(18).toFixed(0)),
      }),
    },
    {
      contractAddress: token_2.address,
      entrypoint: "mint",
      calldata: CallData.compile({
        recipient: account.address,
        amount: cairo.uint256(BigNumber(1000).shiftedBy(18).toFixed(0)),
      }),
    },
      {
        contractAddress: "0x0444a09d96389aa7148f1aada508e30b71299ffe650d9c97fdaae38cb9a23384",
        entrypoint: "maybe_initialize_pool",
        calldata: CallData.compile({
          token_1: token_1.address,
          token_2: token_2.address,
          fee: "0x20c49ba5e353f80000000000000000",
          tick_spacing: "0x3e8",
          extension: 0,
          initial_tick_mag: 0,
          initial_tick_sign: 0,
        }),
      },
      {
        contractAddress: token_1.address,
        entrypoint: "transfer",
        calldata: CallData.compile({
          recipient: "0x06a2aee84bb0ed5dded4384ddd0e40e9c1372b818668375ab8e3ec08807417e5",
          amount: cairo.uint256(BigNumber(10).shiftedBy(18).toFixed(0)),
        }),
      },
      {
        contractAddress: token_2.address,
        entrypoint: "transfer",
        calldata: CallData.compile({
          recipient: "0x06a2aee84bb0ed5dded4384ddd0e40e9c1372b818668375ab8e3ec08807417e5",
          amount: cairo.uint256(BigNumber(10).shiftedBy(18).toFixed(0)),
        }),
      },
      {
        contractAddress: "0x06a2aee84bb0ed5dded4384ddd0e40e9c1372b818668375ab8e3ec08807417e5",
        entrypoint: "mint_and_deposit",
        calldata: CallData.compile({
          token_1: token_1.address,
          token_2: token_2.address,
          fee: "0x20c49ba5e353f80000000000000000",
          tick_spacing: "0x3e8",
          extension: 0,
          bounds_lower_mag: "0x3e80",
          bounds_lower_sign: "0x1",
          bounds_upper_mag: "0x3e80",
          bounds_upper_sign: "0x0",
          min_liquidity: "0x40041bc5ff1a9c3949"
        }),
      },
      {
        contractAddress: "0x06a2aee84bb0ed5dded4384ddd0e40e9c1372b818668375ab8e3ec08807417e5",
        entrypoint: "clear",
        calldata: CallData.compile({
          token: token_1.address,
        }),
      },
      {
        contractAddress: "0x06a2aee84bb0ed5dded4384ddd0e40e9c1372b818668375ab8e3ec08807417e5",
        entrypoint: "clear",
        calldata: CallData.compile({
          token: token_2.address,
        }),
      }
    ] satisfies Call[];

  return await doTransaction(calls);
}