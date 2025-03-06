export async function fetchTokenBalances() {
  console.log('FETCHING TOKEN BALANCES');
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
    console.log('LEADERBOARD INFO', data);
  } catch (error) {
    console.error('Error fetching token balances:', error);
  }
}
