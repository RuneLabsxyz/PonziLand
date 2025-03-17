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

// Base token (e.g. eStark)
export const baseToken: string =
  '0x071de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0';

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
  const baseUrl = 'https://sepolia-api.ekubo.org/pair';
  const url = `${baseUrl}/${tokenA}/${tokenB}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: EkuboApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Ekubo pair data:', error);
    throw error;
  }
}
