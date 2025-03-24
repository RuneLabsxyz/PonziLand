import type { CurrencyAmount } from './utils/CurrencyAmount';
import type data from '$lib/data.json';

interface Coordinates {
  x: number;
  y: number;
}

interface AnimationMeta {
  frames: number;
  ySize: number;
  xSize: number;
}

export interface Token {
  name: string;
  symbol: string;
  address: string;
  liquidityPoolType: string;
  decimals: number;
  images: {
    icon: string;
    biome: Coordinates;
    building: {
      1: Coordinates & AnimationMeta;
      2: Coordinates & AnimationMeta;
      3: Coordinates & AnimationMeta;
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
