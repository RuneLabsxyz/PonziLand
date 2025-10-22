import type { LandTile } from '$lib/components/+game-map/three/landTile';
import { BuildingLand } from '$lib/api/land/building_land';
import { AuctionLand } from '$lib/api/land/auction_land';
import { walletStore, getBaseToken } from '$lib/stores/wallet.svelte';

// Available parameters for heatmap visualization
export enum HeatmapParameter {
  SELL_PRICE = 'sell_price',
  LEVEL = 'level',
  STAKE_AMOUNT = 'stake_amount',
  LAND_AGE = 'land_age',
  TOKEN_TYPE = 'token_type',
  AUCTION_START_PRICE = 'auction_start_price',
  AUCTION_FLOOR_PRICE = 'auction_floor_price',
  AUCTION_AGE = 'auction_age',
  DISTANCE_FROM_CENTER = 'distance_from_center',
}

// Color schemes for heatmap visualization
export enum HeatmapColorScheme {
  HEAT = 'heat', // Red -> Orange -> Yellow
  COOL = 'cool', // Blue -> Cyan -> White
  RAINBOW = 'rainbow', // Full spectrum
  VIRIDIS = 'viridis', // Purple -> Blue -> Green -> Yellow
  GRAYSCALE = 'grayscale', // Black -> White
}

// Parameter configuration with metadata
export interface HeatmapParameterConfig {
  id: HeatmapParameter;
  label: string;
  description: string;
  unit?: string;
  applicableToBuilding: boolean;
  applicableToAuction: boolean;
  defaultColorScheme: HeatmapColorScheme;
  extractor: (tile: LandTile) => number | null;
}

// Color scheme configuration
export interface ColorSchemeConfig {
  id: HeatmapColorScheme;
  label: string;
  colors: number[]; // Array of hex colors as numbers
}

// Parameter configurations
export const HEATMAP_PARAMETERS: Record<
  HeatmapParameter,
  HeatmapParameterConfig
> = {
  [HeatmapParameter.SELL_PRICE]: {
    id: HeatmapParameter.SELL_PRICE,
    label: 'Sell Price',
    description: 'Current selling price of the land',
    unit: `${getBaseToken()?.symbol} equivalent`,
    applicableToBuilding: true,
    applicableToAuction: false,
    defaultColorScheme: HeatmapColorScheme.HEAT,
    extractor: (tile: LandTile) => {
      if (BuildingLand.is(tile.land)) {
        const sellPrice = tile.land.sellPrice;
        const landToken = tile.land.token;

        const currentBaseToken = getBaseToken();
        if (!currentBaseToken || !landToken) {
          return sellPrice.rawValue().toNumber();
        }

        const convertedPrice = walletStore.convertTokenAmount(
          sellPrice,
          landToken,
          currentBaseToken,
        );

        return convertedPrice
          ? convertedPrice.rawValue().toNumber()
          : sellPrice.rawValue().toNumber();
      }
      return null;
    },
  },

  [HeatmapParameter.LEVEL]: {
    id: HeatmapParameter.LEVEL,
    label: 'Land Level',
    description: 'Development level of the land',
    applicableToBuilding: true,
    applicableToAuction: true,
    defaultColorScheme: HeatmapColorScheme.HEAT,
    extractor: (tile: LandTile) => {
      if (BuildingLand.is(tile.land) || AuctionLand.is(tile.land)) {
        return tile.land.level;
      }
      return null;
    },
  },

  [HeatmapParameter.STAKE_AMOUNT]: {
    id: HeatmapParameter.STAKE_AMOUNT,
    label: 'Stake Amount',
    description: 'Amount of tokens staked on this land',
    unit: `${getBaseToken()?.symbol} equivalent`,
    applicableToBuilding: true,
    applicableToAuction: false,
    defaultColorScheme: HeatmapColorScheme.HEAT,
    extractor: (tile: LandTile) => {
      if (BuildingLand.is(tile.land) || AuctionLand.is(tile.land)) {
        const stakeAmount = tile.land.stakeAmount;
        const landToken = tile.land.token;

        const currentBaseToken = getBaseToken();
        if (!currentBaseToken || !landToken) {
          return stakeAmount.rawValue().toNumber();
        }

        const convertedStake = walletStore.convertTokenAmount(
          stakeAmount,
          landToken,
          currentBaseToken,
        );

        return convertedStake
          ? convertedStake.rawValue().toNumber()
          : stakeAmount.rawValue().toNumber();
      }
      return null;
    },
  },

  [HeatmapParameter.LAND_AGE]: {
    id: HeatmapParameter.LAND_AGE,
    label: 'Land Age',
    description: 'How long ago the land was purchased',
    unit: 'days',
    applicableToBuilding: true,
    applicableToAuction: false,
    defaultColorScheme: HeatmapColorScheme.HEAT,
    extractor: (tile: LandTile) => {
      if (BuildingLand.is(tile.land)) {
        const now = new Date();
        const daysDiff =
          (now.getTime() - tile.land.boughtAt.getTime()) /
          (1000 * 60 * 60 * 24);
        return daysDiff;
      }
      return null;
    },
  },

  [HeatmapParameter.TOKEN_TYPE]: {
    id: HeatmapParameter.TOKEN_TYPE,
    label: 'Token Type',
    description: 'Type of token used for this land',
    applicableToBuilding: true,
    applicableToAuction: true,
    defaultColorScheme: HeatmapColorScheme.RAINBOW,
    extractor: (tile: LandTile) => {
      if (BuildingLand.is(tile.land) || AuctionLand.is(tile.land)) {
        // Map token symbols to numeric values for color mapping
        const tokenMap: Record<string, number> = {
          STRK: 1,
          pltSTRK: 1,
          LORDS: 2,
          pltLORDS: 2,
          ETH: 3,
          pltETH: 3,
          PAPER: 4,
          pltPAPER: 4,
          BROTHER: 5,
          pltBROTHER: 5,
          PAL: 6,
          pltPAL: 6,
          empty: 0,
        };
        return tokenMap[tile.land.token?.symbol ?? 'empty'] ?? 0;
      }
      return null;
    },
  },

  [HeatmapParameter.AUCTION_START_PRICE]: {
    id: HeatmapParameter.AUCTION_START_PRICE,
    label: 'Auction Start Price',
    description: 'Starting price of the auction',
    unit: `${getBaseToken()?.symbol} equivalent`,
    applicableToBuilding: false,
    applicableToAuction: true,
    defaultColorScheme: HeatmapColorScheme.HEAT,
    extractor: (tile: LandTile) => {
      if (AuctionLand.is(tile.land)) {
        const startPrice = tile.land.startPrice;

        const currentBaseToken = getBaseToken();
        if (!currentBaseToken) {
          return startPrice.rawValue().toNumber();
        }

        // Auction prices are already in base token, but convert for consistency
        const convertedPrice = walletStore.convertTokenAmount(
          startPrice,
          currentBaseToken,
          currentBaseToken,
        );

        return convertedPrice
          ? convertedPrice.rawValue().toNumber()
          : startPrice.rawValue().toNumber();
      }
      return null;
    },
  },

  [HeatmapParameter.AUCTION_FLOOR_PRICE]: {
    id: HeatmapParameter.AUCTION_FLOOR_PRICE,
    label: 'Auction Floor Price',
    description: 'Floor price of the auction',
    unit: `${getBaseToken()?.symbol} equivalent`,
    applicableToBuilding: false,
    applicableToAuction: true,
    defaultColorScheme: HeatmapColorScheme.HEAT,
    extractor: (tile: LandTile) => {
      if (AuctionLand.is(tile.land)) {
        const floorPrice = tile.land.floorPrice;

        const currentBaseToken = getBaseToken();
        if (!currentBaseToken) {
          return floorPrice.rawValue().toNumber();
        }

        // Auction prices are already in base token, but convert for consistency
        const convertedPrice = walletStore.convertTokenAmount(
          floorPrice,
          currentBaseToken,
          currentBaseToken,
        );

        return convertedPrice
          ? convertedPrice.rawValue().toNumber()
          : floorPrice.rawValue().toNumber();
      }
      return null;
    },
  },

  [HeatmapParameter.AUCTION_AGE]: {
    id: HeatmapParameter.AUCTION_AGE,
    label: 'Auction Age',
    description: 'How long the auction has been running',
    unit: 'hours',
    applicableToBuilding: false,
    applicableToAuction: true,
    defaultColorScheme: HeatmapColorScheme.HEAT,
    extractor: (tile: LandTile) => {
      if (AuctionLand.is(tile.land)) {
        const now = new Date();
        const hoursDiff =
          (now.getTime() - tile.land.startTime.getTime()) / (1000 * 60 * 60);
        return hoursDiff;
      }
      return null;
    },
  },

  [HeatmapParameter.DISTANCE_FROM_CENTER]: {
    id: HeatmapParameter.DISTANCE_FROM_CENTER,
    label: 'Distance from Center',
    description: 'Manhattan distance from map center',
    unit: 'tiles',
    applicableToBuilding: true,
    applicableToAuction: true,
    defaultColorScheme: HeatmapColorScheme.HEAT,
    extractor: (tile: LandTile) => {
      const centerX = 256 / 2; // GRID_SIZE / 2
      const centerY = 256 / 2;
      const distance =
        Math.abs(tile.position[0] - centerX) +
        Math.abs(tile.position[2] - centerY);
      return distance;
    },
  },
};

// Color scheme definitions
export const COLOR_SCHEMES: Record<HeatmapColorScheme, ColorSchemeConfig> = {
  [HeatmapColorScheme.HEAT]: {
    id: HeatmapColorScheme.HEAT,
    label: 'Heat',
    colors: [
      0x000080, 0x0000ff, 0x00ffff, 0x00ff00, 0xffff00, 0xff8000, 0xff0000,
      0xffffff,
    ],
  },

  [HeatmapColorScheme.COOL]: {
    id: HeatmapColorScheme.COOL,
    label: 'Cool',
    colors: [
      0x000040, 0x000080, 0x0040c0, 0x0080ff, 0x40c0ff, 0x80ffff, 0xc0ffff,
      0xffffff,
    ],
  },

  [HeatmapColorScheme.RAINBOW]: {
    id: HeatmapColorScheme.RAINBOW,
    label: 'Rainbow',
    colors: [
      0x8b00ff, 0x0000ff, 0x00ffff, 0x00ff00, 0xffff00, 0xff8000, 0xff0000,
      0xff00ff,
    ],
  },

  [HeatmapColorScheme.VIRIDIS]: {
    id: HeatmapColorScheme.VIRIDIS,
    label: 'Viridis',
    colors: [
      0x440154, 0x482777, 0x3f4a8a, 0x31678e, 0x26838f, 0x1f9d8a, 0x6cce5a,
      0xb6de2b, 0xfee825,
    ],
  },

  [HeatmapColorScheme.GRAYSCALE]: {
    id: HeatmapColorScheme.GRAYSCALE,
    label: 'Grayscale',
    colors: [0x000000, 0x404040, 0x808080, 0xc0c0c0, 0xffffff],
  },
};

// Default heatmap configuration
export const DEFAULT_HEATMAP_CONFIG = {
  enabled: false,
  parameter: HeatmapParameter.SELL_PRICE,
  colorScheme: HeatmapColorScheme.HEAT,
  opacity: 0.7,
  showLegend: true,
};
