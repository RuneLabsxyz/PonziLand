// @notice This token is used to rank users in the leaderboard.
// @notice The token is Emulated stark token.
export const baseToken =
  '0x71de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0';

export async function fetchTokenBalances() {
  try {
    const response = await fetch(
      'https://api.cartridge.gg/x/ponziland-sepolia-target/torii/sql',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: `
          WITH ranked_balances AS (
            SELECT 
              account_address, 
              contract_address, 
              balance,
              ROW_NUMBER() OVER (PARTITION BY contract_address ORDER BY balance DESC) as rank
            FROM token_balances
          )
          SELECT account_address, contract_address, balance 
          FROM ranked_balances 
          WHERE rank <= 50 OR contract_address = '${baseToken}'
          ORDER BY contract_address, balance DESC;
        `,
      },
    );

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return parseTokenBalances(data);
  } catch (error) {
    console.error('Error fetching token balances:', error);
    return {};
  }
}

interface TokenBalanceEntry {
  account_address: string;
  contract_address: string;
  balance: number;
}

export function parseTokenBalances(
  data: TokenBalanceEntry[],
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  data.forEach((entry) => {
    const { account_address, contract_address, balance } = entry;

    if (!result[account_address]) {
      result[account_address] = {};
    }

    result[account_address][contract_address] = balance;
  });

  return result;
}