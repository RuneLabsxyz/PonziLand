import type { CurrencyAmount } from './utils/CurrencyAmount';

interface Coordinates {
  x: number;
  y: number;
}

export interface Token {
  name: string;
  symbol: string;
  address: string;
  lpAddress: string;
  decimals: number;
  images: {
    icon: string;
    biome: Coordinates;
    building: {
      1: Coordinates;
      2: Coordinates;
      3: Coordinates;
    };
  };
}

export interface TileInfo {
  location: number;
  sellPrice: CurrencyAmount;
  tokenUsed: string;
  owner?: string;
  tokenAddress: string;
}

export interface BuyData {
  tokens: Array<{
    name: string;
    address: string;
    lpAddress: string;
  }>;
  stakeAmount: CurrencyAmount;
  sellPrice: CurrencyAmount;
}

export interface Bid {
  price: CurrencyAmount;
  bidder: string;
  timestamp: CurrencyAmount;
}

export interface YieldInfo {
  token: bigint;
  sell_price: bigint;
  per_hour: bigint;
  percent_rate: bigint;
  location: bigint;
}

export interface LandYieldInfo {
  yield_info: Array<YieldInfo>;
  remaining_stake_time: bigint;
}
