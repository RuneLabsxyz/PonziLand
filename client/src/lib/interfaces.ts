import type { CurrencyAmount } from './utils/CurrencyAmount';
import type data from '$profileData';

interface Coordinates {
  x: number;
  y: number;
}

interface AnimationMeta {
  frames: number;
  ySize: number;
  xSize: number;
  xMax: number;
  yMax: number;
  boomerang?: boolean;
  delay?: number;
}

interface AnimationData {
  url: string;
  type: 'rowColumn';
  width: number;
  height: number;
  animations: Array<{ name: string; frameRange: [number, number] }>;
}

interface BuildingLevel {
  x: number;
  y: number;
  useAnimation: boolean;
  animations?: AnimationData[];
}

export interface Token {
  name: string;
  symbol: string;
  address: string;
  liquidityPoolType: string;
  decimals: number;
  skin: string;
}

export interface TokenMetadata {
  skin: string;
  icon: string;
  biome: { x: number; y: number };
  building: {
    1: BuildingLevel;
    2: BuildingLevel;
    3: BuildingLevel;
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
}

export interface ElapsedTimeSinceLastClaim {
  location: bigint;
  elapsed_time: bigint;
}

export type TabType = 'overall' | 'buy' | 'history' | 'quests';
