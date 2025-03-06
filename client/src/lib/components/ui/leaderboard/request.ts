export async function fetchTokenBalances() {
  try {
    const response = await fetch(
      'https://api.cartridge.gg/x/ponziland-sepolia-target/torii/sql',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'SELECT account_address, contract_address, balance FROM token_balances LIMIT 1000;',
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
