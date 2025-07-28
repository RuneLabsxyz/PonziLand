import { RpcProvider, Contract, uint256 } from 'starknet';
import { PUBLIC_DOJO_RPC_URL } from '$env/static/public';
import data from '$profileData';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'felt' }],
    outputs: [{ name: 'balance', type: 'Uint256' }],
    stateMutability: 'view',
  },
];

export interface BalanceResult {
  token: any;
  balance: string;
  account_address?: string;
  contract_address?: string;
  token_id?: string;
  icon?: string;
}

export interface BalanceResponse {
  balances: BalanceResult[];
  prices: any[];
  totalBalanceInBaseToken?: CurrencyAmount;
}

/**
 * Fetch balances using direct RPC calls
 */
export async function fetchBalancesViaRPC(
  address: string,
): Promise<BalanceResult[]> {
  const provider = new RpcProvider({ nodeUrl: PUBLIC_DOJO_RPC_URL });

  const balancePromises = data.availableTokens.map(async (token) => {
    try {
      const contract = new Contract(ERC20_ABI, token.address, provider);
      const result = await contract.balanceOf(address);

      // Handle different response formats
      let balanceValue: bigint;
      if (typeof result === 'object' && 'balance' in result) {
        balanceValue = BigInt(result.balance.toString());
      } else if (
        typeof result === 'object' &&
        'low' in result &&
        'high' in result
      ) {
        balanceValue = uint256.uint256ToBN(result);
      } else if (typeof result === 'bigint') {
        balanceValue = result;
      } else {
        balanceValue = BigInt(result.toString());
      }

      return {
        token,
        balance: balanceValue.toString(),
        account_address: address,
        contract_address: token.address,
        token_id: token.symbol,
        icon: token.images.icon,
      };
    } catch (err) {
      console.error(`Failed to fetch balance for ${token.symbol}:`, err);
      return {
        token,
        balance: '0',
        account_address: address,
        contract_address: token.address,
        token_id: token.symbol,
        icon: token.images.icon,
      };
    }
  });

  return Promise.all(balancePromises);
}

/**
 * Try to fetch balances using Dojo SDK
 */
async function fetchBalancesViaDojo(
  address: string,
  sdk: any,
): Promise<BalanceResult[]> {
  const request = {
    contractAddresses: data.availableTokens.map((token) => token.address),
    accountAddresses: [address],
    tokenIds: [],
  };

  const tokenBalances = await sdk.getTokenBalances({
    contractAddresses: request.contractAddresses,
    accountAddresses: request.accountAddresses,
    tokenIds: request.tokenIds,
  });

  return tokenBalances.items.map((item: any) => {
    const token = data.availableTokens.find(
      (t) => t.address.toLowerCase() === item.contract_address.toLowerCase(),
    );

    return {
      token: token || { address: item.contract_address, symbol: item.token_id },
      balance: item.balance || '0',
      account_address: item.account_address,
      contract_address: item.contract_address,
      token_id: item.token_id,
      icon: token?.images?.icon,
    };
  });
}

/**
 * Get balances with Dojo SDK fallback to RPC
 */
export async function getBalances(
  address: string,
  sdk?: any,
): Promise<BalanceResponse> {
  let balances: BalanceResult[] = [];

  // Try Dojo SDK first if available
  if (sdk) {
    try {
      balances = await fetchBalancesViaDojo(address, sdk);
    } catch (err) {
      console.warn('Dojo SDK failed, using RPC:', err);
      balances = await fetchBalancesViaRPC(address);
    }
  } else {
    // Use RPC directly if no SDK
    console.log('Using RPC directly');
    balances = await fetchBalancesViaRPC(address);
  }

  return {
    balances,
    prices: [],
    totalBalanceInBaseToken: undefined,
  };
}
