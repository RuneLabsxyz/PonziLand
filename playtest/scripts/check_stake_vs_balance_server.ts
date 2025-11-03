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

let analysisData: TokenStakeTotal[] = [];

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
    const amount = BigInt(row.amount);

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
  const divisor = BigInt(10) ** BigInt(18);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === BigInt(0)) {
    return wholePart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(18, "0");
  const trimmedFractional = fractionalStr.replace(/0+$/, "").slice(0, 6);

  if (trimmedFractional === "") {
    return wholePart.toString();
  }

  return `${wholePart}.${trimmedFractional}`;
}

async function performAnalysis(): Promise<void> {
  try {
    console.log(
      `${COLORS.blue}🏁 Starting stake vs balance analysis...${COLORS.reset}\n`,
    );

    const rows = await queryStakeData();
    console.log(
      `${COLORS.green}✅ Retrieved ${rows.length} stake records from database${COLORS.reset}`,
    );

    if (rows.length === 0) {
      console.log(`${COLORS.yellow}⚠️  No stake data found${COLORS.reset}`);
      return;
    }

    const aggregatedData = aggregateStakeByToken(rows);
    console.log(
      `${COLORS.green}✅ Aggregated into ${aggregatedData.length} unique tokens${COLORS.reset}\n`,
    );

    analysisData = await fetchOnChainBalances(aggregatedData);

    console.log(`${COLORS.green}✅ Analysis complete!${COLORS.reset}`);
  } catch (error) {
    console.error(`${COLORS.red}💥 Analysis failed:${COLORS.reset}`, error);
    throw error;
  }
}

function generateHTML(): string {
  const negativeBalances = analysisData.filter(
    (item) => item.difference !== undefined && item.difference < BigInt(0),
  );

  const hasNegativeBalances = negativeBalances.length > 0;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PonziLand - Stake vs Balance Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/starknet@6.11.0/dist/index.iife.js"></script>
    <style>
        body {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background-color: #0a0a0a;
            color: #e0e0e0;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #80EF80;
            text-align: center;
            border-bottom: 2px solid #80EF80;
            padding-bottom: 10px;
        }
        .summary {
            background-color: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .summary h2 {
            color: #FFD700;
            margin-top: 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background-color: #1a1a1a;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #333;
        }
        th {
            background-color: #2a2a2a;
            color: #90D5FF;
            font-weight: bold;
        }
        tr:hover {
            background-color: #2a2a2a;
        }
        .match {
            color: #80EF80;
        }
        .mismatch {
            color: #FA5053;
        }
        .error {
            color: #888;
        }
        .balance-section {
            background-color: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .balance-section h2 {
            color: #FA5053;
            margin-top: 0;
        }
        .balance-item {
            background-color: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
        }
        .balance-form {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }
        input[type="number"] {
            background-color: #0a0a0a;
            border: 1px solid #555;
            color: #e0e0e0;
            padding: 8px 12px;
            border-radius: 4px;
            width: 200px;
        }
        button {
            background-color: #90D5FF;
            color: #0a0a0a;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        button:hover {
            background-color: #7AC3E8;
        }
        button:disabled {
            background-color: #555;
            cursor: not-allowed;
        }
        .wallet-section {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background-color: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
        }
        .connect-button {
            background-color: #80EF80;
            font-size: 18px;
            padding: 15px 30px;
        }
        .connect-button:hover {
            background-color: #6ED96E;
        }
        .wallet-info {
            background-color: #2a2a2a;
            border: 1px solid #80EF80;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
        }
        .status {
            margin: 10px 0;
            padding: 10px;
            border-radius: 4px;
        }
        .status.success {
            background-color: #1a3d1a;
            border: 1px solid #80EF80;
            color: #80EF80;
        }
        .status.error {
            background-color: #3d1a1a;
            border: 1px solid #FA5053;
            color: #FA5053;
        }
        .status.info {
            background-color: #1a2a3d;
            border: 1px solid #90D5FF;
            color: #90D5FF;
        }
        .refresh-button {
            background-color: #FFD700;
            color: #0a0a0a;
        }
        .refresh-button:hover {
            background-color: #E6C200;
        }
        .disconnect-button {
            background-color: #FA5053;
            color: white;
            margin-left: 10px;
        }
        .disconnect-button:hover {
            background-color: #E04247;
        }
        .hidden {
            display: none;
        }
        .wallet-selector {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
            margin: 15px 0;
        }
        .wallet-button {
            background-color: #2a2a2a;
            border: 1px solid #555;
            color: #e0e0e0;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .wallet-button:hover {
            background-color: #3a3a3a;
            border-color: #80EF80;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏗️ PonziLand - Stake vs Balance Analysis</h1>

        <div class="summary">
            <h2>📈 Summary</h2>
            <p><strong>Actions Contract:</strong> ${ACTIONS_CONTRACT}</p>
            <p><strong>Total tokens analyzed:</strong> ${analysisData.length}</p>
            <p><strong>Perfect matches:</strong> <span class="match">${
              analysisData.filter((item) => item.matches === true).length
            }</span></p>
            <p><strong>Mismatches:</strong> <span class="mismatch">${
              analysisData.filter(
                (item) =>
                  item.matches === false && item.difference !== undefined,
              ).length
            }</span></p>
            <p><strong>Errors:</strong> <span class="error">${
              analysisData.filter((item) => item.onChainBalance === undefined)
                .length
            }</span></p>
            <button class="refresh-button" onclick="refreshAnalysis()">🔄 Refresh Analysis</button>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Token</th>
                    <th>DB Stake</th>
                    <th>Chain Balance</th>
                    <th>Difference</th>
                    <th>Status</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                ${analysisData
                  .sort((a, b) => (a.totalStake > b.totalStake ? -1 : 1))
                  .map((item) => {
                    const statusClass =
                      item.matches === true
                        ? "match"
                        : item.matches === false &&
                            item.difference !== undefined
                          ? "mismatch"
                          : "error";
                    const balanceDisplay =
                      item.onChainBalance !== undefined
                        ? formatAmount(item.onChainBalance)
                        : "ERROR";
                    const differenceDisplay =
                      item.difference !== undefined
                        ? item.difference === BigInt(0)
                          ? "MATCH"
                          : item.difference.toString()
                        : "ERROR";

                    return `
                    <tr>
                        <td>${formatTokenAddress(item.token)}</td>
                        <td>${formatAmount(item.totalStake)}</td>
                        <td>${balanceDisplay}</td>
                        <td class="${statusClass}">${differenceDisplay}</td>
                        <td class="${statusClass}">${item.matches === true ? "✅ MATCH" : item.matches === false ? "❌ MISMATCH" : "⚠️ ERROR"}</td>
                        <td>${item.count}</td>
                    </tr>
                    `;
                  })
                  .join("")}
            </tbody>
        </table>

        <div class="wallet-section">
            <div id="wallet-disconnected">
                <h2>🔗 Connect Your Wallet</h2>
                <p>Connect your Starknet wallet to make transactions for balancing negative token amounts.</p>
                <div class="wallet-selector">
                    <button class="wallet-button" onclick="connectWallet('argentX')">
                        🦊 ArgentX
                    </button>
                    <button class="wallet-button" onclick="connectWallet('braavos')">
                        🛡️ Braavos
                    </button>
                </div>
                <p style="font-size: 12px; color: #888; margin-top: 15px;">
                    Don't see your wallet? Try refreshing the page or make sure your Starknet wallet extension is installed and enabled.
                </p>
            </div>

            <div id="wallet-connected" class="hidden">
                <div class="wallet-info">
                    <h3>✅ Wallet Connected</h3>
                    <p><strong>Address:</strong> <span id="wallet-address"></span></p>
                    <p><strong>Wallet:</strong> <span id="wallet-name"></span></p>
                    <button class="disconnect-button" onclick="disconnectWallet()">Disconnect</button>
                </div>
            </div>

            <div id="wallet-status" class="status hidden"></div>
        </div>

        ${
          hasNegativeBalances
            ? `
        <div class="balance-section" id="balance-section">
            <h2>⚖️ Balance Negative Token Amounts</h2>
            <p>The following tokens have negative balances (stake > chain balance). Connect your wallet and send tokens to balance them:</p>

            ${negativeBalances
              .map(
                (item) => `
            <div class="balance-item">
                <h3>Token: ${formatTokenAddress(item.token)}</h3>
                <p><strong>Full Token Address:</strong> <code style="font-size: 12px; background: #0a0a0a; padding: 4px;">${item.token}</code></p>
                <p><strong>Deficit:</strong> <span class="mismatch">${Math.abs(Number(item.difference!))} wei (${formatAmount(BigInt(Math.abs(Number(item.difference!))))})</span></p>
                <div class="balance-form wallet-required" style="opacity: 0.5;">
                    <label>Amount to send (wei):</label>
                    <input
                        type="number"
                        id="amount_${item.token}"
                        placeholder="${Math.abs(Number(item.difference!))}"
                        value="${Math.abs(Number(item.difference!))}"
                        disabled
                    />
                    <button onclick="balanceToken('${item.token}', document.getElementById('amount_${item.token}').value)" disabled>
                        Send Tokens
                    </button>
                </div>
                <div id="status_${item.token}" class="status" style="display: none;"></div>
            </div>
            `,
              )
              .join("")}

            <div style="margin-top: 30px; padding: 20px; background-color: #2a2a2a; border-radius: 8px;">
                <h3 style="text-align: center;">🚀 Bulk Transfer</h3>
                <p style="text-align: center; margin-bottom: 20px;">Send all negative balance amounts in a single transaction (multicall):</p>

                <div id="multicall-summary" style="background-color: #1a1a1a; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #444;">
                    <h4 style="margin-top: 0; color: #90D5FF;">📋 Transaction Summary</h4>
                    <div id="multicall-tokens-list" style="margin: 10px 0;">
                        <p style="color: #888;">Connect wallet and set amounts to see summary</p>
                    </div>
                    <div id="multicall-total" style="margin-top: 10px; font-weight: bold; color: #80EF80;">
                    </div>
                </div>

                <div style="text-align: center;">
                    <button id="multicall-button" onclick="multicallBalanceAll()" disabled style="background-color: #FFD700; color: #0a0a0a; font-size: 16px; padding: 12px 24px; margin: 0 10px;">
                        📦 Transfer All Tokens
                    </button>
                    <button id="update-summary-button" onclick="updateMulticallSummary()" disabled style="background-color: #90D5FF; color: #0a0a0a; font-size: 14px; padding: 10px 20px;">
                        🔄 Update Summary
                    </button>
                </div>
                <div id="multicall-status" class="status" style="display: none;"></div>
            </div>
        </div>
        `
            : ""
        }

        ${
          !hasNegativeBalances
            ? `
        <div class="summary">
            <h2>✅ All Balances Look Good!</h2>
            <p>No negative balances detected. All token stakes match or exceed on-chain balances.</p>
        </div>
        `
            : ""
        }
    </div>

    <script>
        let currentAccount = null;
        let currentWallet = null;

        const ACTIONS_CONTRACT = "${ACTIONS_CONTRACT}";

        async function connectWallet(walletType) {
            const statusDiv = document.getElementById('wallet-status');
            statusDiv.className = 'status info';
            statusDiv.style.display = 'block';
            statusDiv.textContent = \`Connecting to \${walletType}...\`;

            try {
                console.log('Attempting to connect wallet:', walletType);
                console.log('Available window objects:', {
                    starknet_argentX: typeof window.starknet_argentX,
                    starknet: typeof window.starknet,
                    starknet_braavos: typeof window.starknet_braavos
                });

                let wallet;

                if (walletType === 'argentX') {
                    // Try multiple ways to access ArgentX
                    if (typeof window.starknet_argentX !== 'undefined') {
                        wallet = window.starknet_argentX;
                        console.log('Using window.starknet_argentX');
                    } else if (typeof window.starknet !== 'undefined') {
                        wallet = window.starknet;
                        console.log('Using window.starknet');
                    } else {
                        console.error('ArgentX wallet not found in window objects');
                        throw new Error('ArgentX wallet not found. Please install ArgentX extension and refresh the page.');
                    }
                } else if (walletType === 'braavos') {
                    if (typeof window.starknet_braavos === 'undefined') {
                        console.error('Braavos wallet not found in window objects');
                        throw new Error('Braavos wallet not found. Please install Braavos extension and refresh the page.');
                    }
                    wallet = window.starknet_braavos;
                    console.log('Using window.starknet_braavos');
                } else {
                    throw new Error('Unsupported wallet type');
                }

                console.log('Wallet object:', wallet);
                console.log('Requesting wallet connection...');

                // Request connection
                const result = await wallet.enable({ showModal: true });
                console.log('Wallet enable result:', result);

                if (result && result.length > 0) {
                    currentAccount = result[0];
                    currentWallet = walletType;

                    console.log('Wallet connected successfully:', {
                        account: currentAccount,
                        wallet: currentWallet
                    });

                    // Update UI
                    document.getElementById('wallet-disconnected').classList.add('hidden');
                    document.getElementById('wallet-connected').classList.remove('hidden');
                    document.getElementById('wallet-address').textContent = currentAccount;
                    document.getElementById('wallet-name').textContent = walletType === 'argentX' ? 'ArgentX' : 'Braavos';

                    // Enable transaction buttons
                    const walletRequired = document.querySelectorAll('.wallet-required');
                    walletRequired.forEach(el => {
                        el.style.opacity = '1';
                        const inputs = el.querySelectorAll('input');
                        const buttons = el.querySelectorAll('button');
                        inputs.forEach(input => input.disabled = false);
                        buttons.forEach(button => button.disabled = false);
                    });

                    // Enable multicall buttons
                    const multicallButton = document.getElementById('multicall-button');
                    const updateSummaryButton = document.getElementById('update-summary-button');
                    if (multicallButton) {
                        multicallButton.disabled = false;
                    }
                    if (updateSummaryButton) {
                        updateSummaryButton.disabled = false;
                    }

                    // Update multicall summary
                    updateMulticallSummary();

                    statusDiv.className = 'status success';
                    statusDiv.textContent = '✅ Wallet connected successfully!';

                    setTimeout(() => {
                        statusDiv.style.display = 'none';
                    }, 3000);
                } else {
                    console.error('Wallet enable returned invalid result:', result);
                    throw new Error('Failed to connect wallet');
                }
            } catch (error) {
                console.error('Wallet connection error:', error);
                statusDiv.className = 'status error';
                statusDiv.textContent = '❌ ' + error.message;
            }
        }

        function disconnectWallet() {
            currentAccount = null;
            currentWallet = null;

            // Update UI
            document.getElementById('wallet-disconnected').classList.remove('hidden');
            document.getElementById('wallet-connected').classList.add('hidden');

            // Disable transaction buttons
            const walletRequired = document.querySelectorAll('.wallet-required');
            walletRequired.forEach(el => {
                el.style.opacity = '0.5';
                const inputs = el.querySelectorAll('input');
                const buttons = el.querySelectorAll('button');
                inputs.forEach(input => input.disabled = true);
                buttons.forEach(button => button.disabled = true);
            });

            // Disable multicall buttons
            const multicallButton = document.getElementById('multicall-button');
            const updateSummaryButton = document.getElementById('update-summary-button');
            if (multicallButton) {
                multicallButton.disabled = true;
            }
            if (updateSummaryButton) {
                updateSummaryButton.disabled = true;
            }

            // Clear multicall summary
            const summaryDiv = document.getElementById('multicall-tokens-list');
            const totalDiv = document.getElementById('multicall-total');
            if (summaryDiv) {
                summaryDiv.innerHTML = '<p style="color: #888;">Connect wallet and set amounts to see summary</p>';
            }
            if (totalDiv) {
                totalDiv.innerHTML = '';
            }

            const statusDiv = document.getElementById('wallet-status');
            statusDiv.className = 'status info';
            statusDiv.style.display = 'block';
            statusDiv.textContent = 'Wallet disconnected';

            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 2000);
        }

        async function balanceToken(tokenAddress, amount) {
            if (!currentAccount) {
                alert('Please connect your wallet first');
                return;
            }

            const statusDiv = document.getElementById('status_' + tokenAddress);
            statusDiv.style.display = 'block';
            statusDiv.className = 'status info';
            statusDiv.textContent = 'Preparing transaction...';

            try {
                let wallet;
                if (currentWallet === 'argentX') {
                    wallet = window.starknet_argentX || window.starknet;
                } else if (currentWallet === 'braavos') {
                    wallet = window.starknet_braavos;
                }

                if (!wallet) {
                    throw new Error('Wallet not found. Please refresh the page and try again.');
                }

                const account = wallet.account;

                // Prepare the transfer call
                const transferCall = {
                    contractAddress: tokenAddress,
                    entrypoint: 'transfer',
                    calldata: [
                        ACTIONS_CONTRACT,
                        amount,
                        '0'  // high part of u256
                    ]
                };

                console.log('Single token transfer preparation:', {
                    tokenAddress: tokenAddress,
                    amount: amount,
                    transferCall: transferCall,
                    actionsContract: ACTIONS_CONTRACT
                });

                statusDiv.textContent = 'Sending transaction...';

                // Execute the transaction
                console.log('Executing single transfer transaction...');
                const result = await account.execute(transferCall);
                console.log('Single transfer result:', result);

                statusDiv.className = 'status success';
                statusDiv.innerHTML = \`✅ Transaction sent!<br/>Hash: \${result.transaction_hash}<br/>Waiting for confirmation...\`;

                // Wait for transaction to be accepted
                try {
                    console.log('Waiting for single transfer confirmation:', result.transaction_hash);
                    const provider = new starknet.RpcProvider({
                        nodeUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9"
                    });

                    await provider.waitForTransaction(result.transaction_hash);
                    console.log('Single transfer confirmed successfully');

                    statusDiv.innerHTML = \`✅ Transaction confirmed!<br/>Hash: \${result.transaction_hash}\`;

                    // Refresh analysis after successful transaction
                    setTimeout(refreshAnalysis, 5000);
                } catch (waitError) {
                    console.error('Single transfer confirmation failed:', waitError);
                    statusDiv.innerHTML = \`⚠️ Transaction sent but confirmation failed<br/>Hash: \${result.transaction_hash}<br/>Please check manually\`;
                }

            } catch (error) {
                console.error('Single transfer error:', error);
                console.error('Single transfer error details:', {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
                statusDiv.className = 'status error';
                statusDiv.textContent = '❌ Transaction failed: ' + (error.message || error);
            }
        }

        async function multicallBalanceAll() {
            if (!currentAccount) {
                alert('Please connect your wallet first');
                return;
            }

            const statusDiv = document.getElementById('multicall-status');
            statusDiv.style.display = 'block';
            statusDiv.className = 'status info';
            statusDiv.textContent = 'Preparing multicall transaction...';

            try {
                let wallet;
                if (currentWallet === 'argentX') {
                    wallet = window.starknet_argentX || window.starknet;
                } else if (currentWallet === 'braavos') {
                    wallet = window.starknet_braavos;
                }

                if (!wallet) {
                    throw new Error('Wallet not found. Please refresh the page and try again.');
                }

                const account = wallet.account;

                // Get all negative balance tokens and their amounts
                const calls = [];
                const negativeTokens = [];

                // Find all amount inputs for negative balance tokens
                const amountInputs = document.querySelectorAll('input[id^="amount_"]');

                amountInputs.forEach(input => {
                    const tokenAddress = input.id.replace('amount_', '');
                    const amount = input.value;

                    if (amount && parseFloat(amount) > 0) {
                        calls.push({
                            contractAddress: tokenAddress,
                            entrypoint: 'transfer',
                            calldata: [
                                ACTIONS_CONTRACT,
                                amount,
                                '0'  // high part of u256
                            ]
                        });

                        // Get token display name from the UI
                        const tokenDisplayElement = input.closest('.balance-item').querySelector('h3');
                        const tokenDisplay = tokenDisplayElement ? tokenDisplayElement.textContent.replace('Token: ', '') : tokenAddress.slice(0, 10) + '...';

                        negativeTokens.push({
                            token: tokenDisplay,
                            amount: amount
                        });
                    }
                });

                if (calls.length === 0) {
                    statusDiv.className = 'status error';
                    statusDiv.textContent = '❌ No valid amounts to transfer. Make sure amounts are greater than 0.';
                    return;
                }

                const totalValue = calls.reduce((sum, call) => sum + parseFloat(call.calldata[1]), 0);
                const confirmed = confirm(\`About to transfer tokens to \${calls.length} contracts.\\n\\nTokens: \${negativeTokens.map(t => t.token).join(', ')}\\n\\nProceed?\`);

                if (!confirmed) {
                    statusDiv.style.display = 'none';
                    return;
                }

                console.log('Multicall preparation:', {
                    callsCount: calls.length,
                    calls: calls,
                    negativeTokens: negativeTokens
                });

                statusDiv.textContent = \`Sending multicall with \${calls.length} transfers...\`;

                // Execute the multicall transaction
                console.log('Executing multicall transaction...');
                const result = await account.execute(calls);
                console.log('Multicall result:', result);

                statusDiv.className = 'status success';
                statusDiv.innerHTML = \`✅ Multicall sent!<br/>Hash: \${result.transaction_hash}<br/>Transfers: \${negativeTokens.map(t => t.token).join(', ')}<br/>Waiting for confirmation...\`;

                // Wait for transaction to be accepted
                try {
                    console.log('Waiting for transaction confirmation:', result.transaction_hash);
                    const provider = new starknet.RpcProvider({
                        nodeUrl: "https://api.cartridge.gg/x/starknet/mainnet/rpc/v0_9"
                    });

                    await provider.waitForTransaction(result.transaction_hash);
                    console.log('Transaction confirmed successfully');

                    statusDiv.innerHTML = \`✅ Multicall confirmed!<br/>Hash: \${result.transaction_hash}<br/>Successfully transferred to \${calls.length} tokens\`;

                    // Refresh analysis after successful transaction
                    setTimeout(refreshAnalysis, 5000);
                } catch (waitError) {
                    console.error('Transaction confirmation failed:', waitError);
                    statusDiv.innerHTML = \`⚠️ Multicall sent but confirmation failed<br/>Hash: \${result.transaction_hash}<br/>Please check manually\`;
                }

            } catch (error) {
                console.error('Multicall error:', error);
                console.error('Error details:', {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
                statusDiv.className = 'status error';
                statusDiv.textContent = '❌ Multicall failed: ' + (error.message || error);
            }
        }

        function updateMulticallSummary() {
            const summaryDiv = document.getElementById('multicall-tokens-list');
            const totalDiv = document.getElementById('multicall-total');

            if (!summaryDiv || !totalDiv) return;

            const amountInputs = document.querySelectorAll('input[id^="amount_"]');
            const validTokens = [];
            let totalTokens = 0;

            amountInputs.forEach(input => {
                const tokenAddress = input.id.replace('amount_', '');
                const amount = input.value;

                if (amount && parseFloat(amount) > 0) {
                    // Get token display name from the UI
                    const tokenDisplayElement = input.closest('.balance-item').querySelector('h3');
                    const tokenDisplay = tokenDisplayElement ? tokenDisplayElement.textContent.replace('Token: ', '') : tokenAddress.slice(0, 10) + '...';

                    validTokens.push({
                        token: tokenDisplay,
                        amount: amount,
                        tokenAddress: tokenAddress
                    });
                    totalTokens++;
                }
            });

            if (validTokens.length === 0) {
                summaryDiv.innerHTML = '<p style="color: #888;">No tokens with valid amounts found</p>';
                totalDiv.innerHTML = '';

                const multicallButton = document.getElementById('multicall-button');
                if (multicallButton) {
                    multicallButton.style.opacity = '0.5';
                }
            } else {
                const tokensList = validTokens.map(t =>
                    \`<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #333;">
                        <span style="color: #e0e0e0;">\${t.token}</span>
                        <span style="color: #80EF80; font-family: monospace;">\${t.amount} wei</span>
                    </div>\`
                ).join('');

                summaryDiv.innerHTML = tokensList;
                totalDiv.innerHTML = \`Total transfers: \${totalTokens} tokens\`;

                const multicallButton = document.getElementById('multicall-button');
                if (multicallButton) {
                    multicallButton.style.opacity = '1';
                }
            }
        }

        // Auto-update summary when amount inputs change
        document.addEventListener('input', function(e) {
            if (e.target && e.target.id && e.target.id.startsWith('amount_')) {
                // Debounce the update
                clearTimeout(window.summaryUpdateTimeout);
                window.summaryUpdateTimeout = setTimeout(updateMulticallSummary, 500);
            }
        });

        async function refreshAnalysis() {
            try {
                const response = await fetch('/refresh', {
                    method: 'POST'
                });

                const result = await response.json();

                if (result.success) {
                    location.reload();
                } else {
                    alert('Failed to refresh: ' + result.error);
                }
            } catch (error) {
                alert('Refresh failed: ' + error.message);
            }
        }

        // Function to check wallet availability
        function checkWalletAvailability() {
            console.log('Checking wallet availability...');
            console.log('Window objects available:', {
                starknet_argentX: typeof window.starknet_argentX,
                starknet: typeof window.starknet,
                starknet_braavos: typeof window.starknet_braavos,
                all_window_keys: Object.keys(window).filter(key => key.includes('starknet'))
            });

            const argentButton = document.querySelector('button[onclick*="argentX"]');
            const braavosButton = document.querySelector('button[onclick*="braavos"]');

            // Check for ArgentX
            const hasArgentX = typeof window.starknet_argentX !== 'undefined' ||
                              typeof window.starknet !== 'undefined';

            if (!hasArgentX) {
                argentButton.disabled = true;
                argentButton.textContent = '🦊 ArgentX (Not Installed)';
                argentButton.title = 'Please install ArgentX extension';
                console.log('ArgentX not detected');
            } else {
                argentButton.disabled = false;
                argentButton.textContent = '🦊 ArgentX';
                argentButton.title = 'Connect with ArgentX';
                console.log('ArgentX detected');
            }

            // Check for Braavos
            const hasBraavos = typeof window.starknet_braavos !== 'undefined';

            if (!hasBraavos) {
                braavosButton.disabled = true;
                braavosButton.textContent = '🛡️ Braavos (Not Installed)';
                braavosButton.title = 'Please install Braavos extension';
                console.log('Braavos not detected');
            } else {
                braavosButton.disabled = false;
                braavosButton.textContent = '🛡️ Braavos';
                braavosButton.title = 'Connect with Braavos';
                console.log('Braavos detected');
            }

            // Show available wallets count
            const availableWallets = [hasArgentX, hasBraavos].filter(Boolean).length;
            console.log(\`Found \${availableWallets} available Starknet wallets\`);
        }

        // Check on page load
        document.addEventListener('DOMContentLoaded', function() {
            checkWalletAvailability();
        });

        // Also check after a short delay for wallet extensions that load slower
        setTimeout(checkWalletAvailability, 1000);
        setTimeout(checkWalletAvailability, 3000);
    </script>
</body>
</html>
  `;
}

async function startServer(): Promise<void> {
  const server = Bun.serve({
    port: 3000,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/") {
        return new Response(generateHTML(), {
          headers: { "content-type": "text/html" },
        });
      }

      if (url.pathname === "/refresh" && req.method === "POST") {
        try {
          await performAnalysis();
          return Response.json({ success: true });
        } catch (error) {
          return Response.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      if (url.pathname === "/api/data" && req.method === "GET") {
        return Response.json({
          success: true,
          data: analysisData,
          actionsContract: ACTIONS_CONTRACT,
        });
      }

      return new Response("Not found", { status: 404 });
    },
  });

  console.log(
    `${COLORS.green}🌐 Server running at http://localhost:${server.port}${COLORS.reset}`,
  );
}

async function main(): Promise<void> {
  try {
    // Perform initial analysis
    await performAnalysis();

    // Start the web server
    await startServer();
  } catch (error) {
    console.error(
      `${COLORS.red}💥 Failed to start server:${COLORS.reset}`,
      error,
    );
    process.exit(1);
  }
}

// Run the server
main();
