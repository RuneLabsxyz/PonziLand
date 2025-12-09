import { PUBLIC_PONZI_API_URL } from '$env/static/public';
import {
  calculatePositionMetrics,
  type PositionMetrics,
} from './position-pnl-calculator';

export interface TokenFlow {
  [tokenAddress: string]: string; // hex amount
}

export interface HistoricalPosition {
  id: string;
  owner: string;
  land_location: number;
  time_bought: string;
  close_date: string;
  close_reason: 'bought' | 'nuked';
  buy_cost_token: string;
  buy_cost_usd: null;
  buy_token_used: string | null;
  sale_revenue_token: string | null;
  sale_revenue_usd: null;
  sale_token_used: string | null;
  net_profit_token: string | null;
  net_profit_usd: null;
  token_inflows: TokenFlow;
  token_outflows: TokenFlow;
  metrics?: PositionMetrics; // Pre-calculated metrics
}

export async function fetchHistoricalPositions(
  address: string,
): Promise<HistoricalPosition[]> {
  try {
    // Remove the leading zero after 0x if present
    let formattedAddress = address;
    if (address.startsWith('0x0') && address.length === 66) {
      formattedAddress = '0x' + address.slice(3);
    }

    const response = await fetch(
      `${PUBLIC_PONZI_API_URL}/land-historical/${formattedAddress}`,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch historical positions: ${response.statusText}`,
      );
    }

    const data = await response.json();
    const positions = data as HistoricalPosition[];

    // Calculate metrics once for each position
    return positions.map((position) => ({
      ...position,
      metrics: calculatePositionMetrics(position),
    }));
  } catch (error) {
    console.error('Error fetching historical positions:', error);
    throw error;
  }
}
