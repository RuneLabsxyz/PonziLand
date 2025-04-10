import { PUBLIC_EKUBO_URL } from '$env/static/public';

export interface TokenVolume {
  token: string;
  volume: string;
  fees: string;
}

export interface TokenTVL {
  token: string;
  balance: string;
}

export interface TVLDeltaEntry {
  token: string;
  date: string;
  delta: string;
}

export interface PoolInfo {
  fee: number;
  tvl0_total: string;
  tvl1_total: string;
  address: string;
}

export interface EkuboApiResponse {
  timestamp: number;
  tvlByToken: TokenTVL[];
  volumeByToken: TokenVolume[];
  revenueByToken: any[];
  tvlDeltaByTokenByDate: TVLDeltaEntry[];
  volumeByTokenByDate: any[];
  revenueByTokenByDate: any[];
  topPools: PoolInfo[];
}

/**
 * @notice Fetches pair data from Ekubo API for two tokens
 * @dev Makes an HTTP request to the Ekubo API endpoint
 * @param tokenA The address of the first token
 * @param tokenB The address of the second token
 * @returns Promise that resolves to the Ekubo API response
 */
export async function fetchEkuboPairData(
  tokenA: string,
  tokenB: string,
): Promise<EkuboApiResponse> {
  const baseUrl = PUBLIC_EKUBO_URL + '/pair';
  const url = `${baseUrl}/${tokenA}/${tokenB}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorContent = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, content: ${errorContent}`);
    }
    const data: EkuboApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Ekubo pair data:', error);
    throw error;
  }
}

/**
 * Calculates the exchange price of token0 in terms of token1
 * from the given PoolInfo.
 *
 * @param pool - The pool data containing liquidity information.
 * @param token0Decimals - Number of decimals for token0 (optional, defaults to 18)
 * @param token1Decimals - Number of decimals for token1 (optional, defaults to 18)
 * @returns The price of one unit of token0 expressed in token1, adjusted for decimals
 */
export function calculatePriceFromPool(
  pool: PoolInfo,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): number {
  const reserve0 = BigInt(pool.tvl0_total);
  const reserve1 = BigInt(pool.tvl1_total);

  if (reserve0 === 0n) {
    throw new Error('Token0 reserve is zero, cannot compute price.');
  }

  const rawPrice = Number(reserve1) / Number(reserve0);
  const decimalAdjustment = Math.pow(10, token1Decimals - token0Decimals);
  const adjustedPrice = rawPrice * decimalAdjustment;

  console.log('adjustedPrice', adjustedPrice);

  return adjustedPrice;
}
