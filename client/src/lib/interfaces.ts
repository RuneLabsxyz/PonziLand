import type { CurrencyAmount } from './utils/CurrencyAmount';

export interface Token {
  name: string;
  address: string;
  lpAddress: string;
  decimals: number;
  images: {
    icon: string;
    castle: {
      basic: string;
      advanced: string;
      premium: string;
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
  token: string;
  sell_price: number;
  percent_rate: number;
}

export interface LandYieldInfo {
  yield_info: Array<YieldInfo>;
  remaining_stake_time: number;
}
