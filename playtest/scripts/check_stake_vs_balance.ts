import { COLORS } from "./utils";
import { RpcProvider } from "starknet";

interface LandStakeRow {
  token_used: string;
  amount: string;
}

interface TokenStakeTotal {
  token: string;
  totalStake: bigint;
  count: number;
  onChainBalance?: bigint;
  difference?: bigint;
  matches?: boolean;
}

const ACTIONS_CONTRACT =
  "0x7e2dd623390edcbadde1def93aa6c8a1866c664273d9a4e5f8129a060d25916";

async function queryStakeData(): Promise<LandStakeRow[]> {
  console.log(
    `${COLORS.blue}🔍 Querying stake data from Torii API...${COLORS.reset}`,
  );

  const query = `
    SELECT l.token_used, ls.amount
    FROM \`ponzi_land-Land\` l
    JOIN \`ponzi_land-LandStake\` ls ON l.location = ls.location;
  `;

  try {
    const response = await fetch(
      "https://api.cartridge.gg/x/ponziland-mainnet-world/torii/sql",
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: query.trim(),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error(
      `${COLORS.red}❌ Failed to query stake data:${COLORS.reset}`,
      error,
    );
    throw error;
  }
}

function aggregateStakeByToken(rows: LandStakeRow[]): TokenStakeTotal[] {
  const tokenMap = new Map<string, { total: bigint; count: number }>();

  for (const row of rows) {
    const token = row.token_used;
    const amount = BigInt(row.amount); // Convert hex string to bigint

    if (tokenMap.has(token)) {
      const existing = tokenMap.get(token)!;
      tokenMap.set(token, {
        total: existing.total + amount,
        count: existing.count + 1,
      });
    } else {
      tokenMap.set(token, {
        total: amount,
        count: 1,
      });
    }
  }

  return Array.from(tokenMap.entries()).map(([token, { total, count }]) => ({
    token,
    totalStake: total,
    count,
  }));
}

async function fetchOnChainBalances(
  tokens: TokenStakeTotal[],
): Promise<TokenStakeTotal[]> {
  console.log(
    `${COLORS.blue}🔗 Connecting to Starknet and fetching on-chain balances...${COLORS.reset}`,
  );

  const provider = new RpcProvider({
    nodeUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9",
  });

  const results: TokenStakeTotal[] = [];

  // balanceOf selector
  const balanceOfSelector =
    "0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e";

  for (const tokenData of tokens) {
    try {
      console.log(
        `  • Checking balance for ${formatTokenAddress(tokenData.token)}...`,
      );

      const callResult = await provider.callContract({
        contractAddress: tokenData.token,
        entrypoint: "balanceOf",
        calldata: [ACTIONS_CONTRACT],
      });

      // Handle u256 response (balance is typically returned as [low, high])
      let balanceBigInt: bigint;
      if (callResult && callResult.length >= 2) {
        const low = BigInt(callResult[0]);
        const high = BigInt(callResult[1]);
        balanceBigInt = low + (high << BigInt(128));
      } else if (callResult && callResult.length === 1) {
        balanceBigInt = BigInt(callResult[0]);
      } else {
        throw new Error("Unexpected balance response format");
      }

      const difference = balanceBigInt - tokenData.totalStake;
      const matches = difference === BigInt(0);

      results.push({
        ...tokenData,
        onChainBalance: balanceBigInt,
        difference,
        matches,
      });
    } catch (error) {
      console.log(
        `    ${COLORS.red}⚠️  Failed to fetch balance: ${error}${COLORS.reset}`,
      );
      results.push({
        ...tokenData,
        onChainBalance: undefined,
        difference: undefined,
        matches: false,
      });
    }
  }

  return results;
}

function formatTokenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatAmount(amount: bigint): string {
  // Convert to readable format (assuming 18 decimals for most tokens)
  const divisor = BigInt(10) ** BigInt(18);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === BigInt(0)) {
    return wholePart.toString();
  }

  // Show up to 6 decimal places for fractional part
  const fractionalStr = fractionalPart.toString().padStart(18, "0");
  const trimmedFractional = fractionalStr.replace(/0+$/, "").slice(0, 6);

  if (trimmedFractional === "") {
    return wholePart.toString();
  }

  return `${wholePart}.${trimmedFractional}`;
}

function formatDifference(difference: bigint): string {
  if (difference === BigInt(0)) {
    return "MATCH";
  } else if (difference > BigInt(0)) {
    return `+${difference}`;
  } else {
    return `${difference}`;
  }
}

function printComparisonTable(data: TokenStakeTotal[]): void {
  console.log(
    `\n${COLORS.green}📊 Stake vs Balance Comparison:${COLORS.reset}\n`,
  );

  // Sort by total stake (descending)
  const sorted = data.sort((a, b) => {
    if (a.totalStake > b.totalStake) return -1;
    if (a.totalStake < b.totalStake) return 1;
    return 0;
  });

  // Calculate column widths
  const tokenWidth = Math.max(
    15,
    Math.max(...sorted.map((item) => formatTokenAddress(item.token).length)),
  );
  const amountWidth = 20;
  const statusWidth = Math.max(
    15,
    Math.max(
      ...sorted.map((item) => {
        const statusText =
          item.difference !== undefined
            ? formatDifference(item.difference)
            : "ERROR";
        return statusText.length;
      }),
    ),
  );
  const countWidth = Math.max(
    5,
    Math.max(...sorted.map((item) => item.count.toString().length)),
  );

  // Print header
  const headerSeparator = "─".repeat(
    tokenWidth + amountWidth * 2 + statusWidth + countWidth + 14,
  );
  console.log(`┌${headerSeparator}┐`);
  console.log(
    `│ ${"Token".padEnd(tokenWidth)} │ ${"DB Stake".padEnd(amountWidth)} │ ${"Chain Balance".padEnd(amountWidth)} │ ${"Status".padEnd(statusWidth)} │ ${"Count".padEnd(countWidth)} │`,
  );
  console.log(`├${headerSeparator}┤`);

  // Print data rows
  for (const item of sorted) {
    const tokenDisplay = formatTokenAddress(item.token);
    const stakeDisplay = formatAmount(item.totalStake);
    const balanceDisplay =
      item.onChainBalance !== undefined
        ? formatAmount(item.onChainBalance)
        : "ERROR";
    const statusDisplay =
      item.difference !== undefined
        ? formatDifference(item.difference)
        : "❌ ERROR";
    const countDisplay = item.count.toString();

    // Color coding for status
    let statusColor = COLORS.reset;
    if (item.matches === true) {
      statusColor = COLORS.green;
    } else if (item.matches === false && item.difference !== undefined) {
      statusColor = COLORS.red;
    } else {
      statusColor = COLORS.gray;
    }

    console.log(
      `│ ${tokenDisplay.padEnd(tokenWidth)} │ ${stakeDisplay.padEnd(amountWidth)} │ ${balanceDisplay.padEnd(amountWidth)} │ ${statusColor}${statusDisplay.padEnd(statusWidth)}${COLORS.reset} │ ${countDisplay.padEnd(countWidth)} │`,
    );
  }

  console.log(`└${headerSeparator}┘`);

  // Print summary
  const totalMatches = sorted.filter((item) => item.matches === true).length;
  const totalMismatches = sorted.filter(
    (item) => item.matches === false && item.difference !== undefined,
  ).length;
  const totalErrors = sorted.filter(
    (item) => item.onChainBalance === undefined,
  ).length;
  const totalTokens = sorted.length;

  console.log(`\n${COLORS.yellow}📈 Summary:${COLORS.reset}`);
  console.log(`   • Total tokens analyzed: ${totalTokens}`);
  console.log(
    `   • ${COLORS.green}Perfect matches: ${totalMatches}${COLORS.reset}`,
  );
  console.log(
    `   • ${COLORS.red}Mismatches: ${totalMismatches}${COLORS.reset}`,
  );
  console.log(`   • ${COLORS.gray}Errors: ${totalErrors}${COLORS.reset}`);

  if (totalMismatches > 0) {
    console.log(
      `\n${COLORS.yellow}⚠️  Note: Mismatches could indicate:${COLORS.reset}`,
    );
    console.log(`   • Pending transactions not yet reflected in the database`);
    console.log(`   • Direct token transfers to/from the actions contract`);
    console.log(`   • Tokens held for purposes other than land stakes`);
  }
}

async function main(): Promise<void> {
  try {
    console.log(
      `${COLORS.blue}🏁 Starting stake vs balance analysis...${COLORS.reset}\n`,
    );
    console.log(
      `${COLORS.gray}Actions contract: ${ACTIONS_CONTRACT}${COLORS.reset}\n`,
    );

    // Query database stakes
    const rows = await queryStakeData();
    console.log(
      `${COLORS.green}✅ Retrieved ${rows.length} stake records from database${COLORS.reset}`,
    );

    if (rows.length === 0) {
      console.log(`${COLORS.yellow}⚠️  No stake data found${COLORS.reset}`);
      return;
    }

    // Aggregate by token
    const aggregatedData = aggregateStakeByToken(rows);
    console.log(
      `${COLORS.green}✅ Aggregated into ${aggregatedData.length} unique tokens${COLORS.reset}\n`,
    );

    // Fetch on-chain balances
    const dataWithBalances = await fetchOnChainBalances(aggregatedData);

    // Display comparison table
    printComparisonTable(dataWithBalances);

    console.log(`\n${COLORS.green}✅ Analysis complete!${COLORS.reset}`);
  } catch (error) {
    console.error(`${COLORS.red}💥 Script failed:${COLORS.reset}`, error);
    process.exit(1);
  }
}

// Run the script
main();
