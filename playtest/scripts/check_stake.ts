import { COLORS } from "./utils";

interface LandStakeRow {
  token_used: string;
  amount: string;
}

interface TokenStakeTotal {
  token: string;
  totalStake: bigint;
  count: number;
}

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

function formatTokenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatStakeAmount(amount: bigint): string {
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

function printStakeTable(aggregatedData: TokenStakeTotal[]): void {
  console.log(`\n${COLORS.green}📊 Stake Summary by Token:${COLORS.reset}\n`);

  // Sort by total stake (descending)
  const sorted = aggregatedData.sort((a, b) => {
    if (a.totalStake > b.totalStake) return -1;
    if (a.totalStake < b.totalStake) return 1;
    return 0;
  });

  // Calculate column widths
  const tokenWidth = Math.max(
    15,
    Math.max(...sorted.map((item) => formatTokenAddress(item.token).length)),
  );
  const stakeWidth = Math.max(
    20,
    Math.max(
      ...sorted.map((item) => formatStakeAmount(item.totalStake).length),
    ),
  );
  const countWidth = 8;

  // Print header
  const headerSeparator = "─".repeat(tokenWidth + stakeWidth + countWidth + 8);
  console.log(`┌${headerSeparator}┐`);
  console.log(
    `│ ${"Token".padEnd(tokenWidth)} │ ${"Total Stake".padEnd(stakeWidth)} │ ${"Count".padEnd(countWidth)} │`,
  );
  console.log(`├${headerSeparator}┤`);

  // Print data rows
  for (const item of sorted) {
    const tokenDisplay = formatTokenAddress(item.token);
    const stakeDisplay = formatStakeAmount(item.totalStake);
    const countDisplay = item.count.toString();

    console.log(
      `│ ${tokenDisplay.padEnd(tokenWidth)} │ ${stakeDisplay.padEnd(stakeWidth)} │ ${countDisplay.padEnd(countWidth)} │`,
    );
  }

  console.log(`└${headerSeparator}┘`);

  // Print summary
  const totalStaked = sorted.reduce(
    (sum, item) => sum + item.totalStake,
    BigInt(0),
  );
  const totalEntries = sorted.reduce((sum, item) => sum + item.count, 0);
  const uniqueTokens = sorted.length;

  console.log(`\n${COLORS.yellow}📈 Summary:${COLORS.reset}`);
  console.log(`   • Unique tokens: ${uniqueTokens}`);
  console.log(`   • Total stake entries: ${totalEntries}`);
  console.log(
    `   • Combined stake value: ${formatStakeAmount(totalStaked)} (raw sum across all tokens)`,
  );
}

async function main(): void {
  try {
    console.log(`${COLORS.blue}🏁 Starting stake analysis...${COLORS.reset}\n`);

    const rows = await queryStakeData();
    console.log(
      `${COLORS.green}✅ Retrieved ${rows.length} stake records${COLORS.reset}`,
    );

    if (rows.length === 0) {
      console.log(`${COLORS.yellow}⚠️  No stake data found${COLORS.reset}`);
      return;
    }

    const aggregatedData = aggregateStakeByToken(rows);
    printStakeTable(aggregatedData);

    console.log(`\n${COLORS.green}✅ Analysis complete!${COLORS.reset}`);
  } catch (error) {
    console.error(`${COLORS.red}💥 Script failed:${COLORS.reset}`, error);
    process.exit(1);
  }
}

// Run the script
main();
