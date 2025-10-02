import type { LandTile } from '$lib/components/+game-map/three/landTile';
import {
  HeatmapParameter,
  HeatmapColorScheme,
  HEATMAP_PARAMETERS,
  COLOR_SCHEMES,
  type HeatmapParameterConfig,
  type ColorSchemeConfig,
} from './heatmap.config';
import { baseToken } from '$lib/stores/wallet.svelte';

export interface HeatmapCalculationResult {
  colors: Map<LandTile, number>; // Map from tile to color (as hex number)
  minValue: number;
  maxValue: number;
  validTileCount: number;
}

export class HeatmapCalculator {
  // Default dark tint color for lands with no value
  private static readonly DEFAULT_NO_VALUE_COLOR = 0x202020;

  /**
   * Calculate heatmap colors for given tiles and parameters
   */
  static calculate(
    tiles: LandTile[],
    parameter: HeatmapParameter,
    colorScheme: HeatmapColorScheme,
  ): HeatmapCalculationResult {
    const paramConfig = HEATMAP_PARAMETERS[parameter];
    const schemeConfig = COLOR_SCHEMES[colorScheme];

    // Extract values from tiles
    const tileValues = new Map<LandTile, number>();
    const tilesWithoutValues: LandTile[] = [];

    for (const tile of tiles) {
      const value = paramConfig.extractor(tile);
      if (value !== null && !isNaN(value) && isFinite(value)) {
        tileValues.set(tile, value);
      } else {
        tilesWithoutValues.push(tile);
      }
    }

    const colors = new Map<LandTile, number>();

    // First, assign default dark color to tiles without values
    for (const tile of tilesWithoutValues) {
      colors.set(tile, this.DEFAULT_NO_VALUE_COLOR);
    }

    if (tileValues.size === 0) {
      // No valid data - return only the no-value tiles with default color
      return {
        colors,
        minValue: 0,
        maxValue: 0,
        validTileCount: 0,
      };
    }

    // Calculate min/max for normalization
    const values = Array.from(tileValues.values());
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Handle case where all values are the same
    const range = maxValue - minValue;
    const normalizedTileValues = new Map<LandTile, number>();

    if (range === 0) {
      // All values are the same - use middle color
      for (const [tile] of tileValues) {
        normalizedTileValues.set(tile, 0.5);
      }
    } else {
      // Normalize values to 0-1 range
      for (const [tile, value] of tileValues) {
        const normalized = (value - minValue) / range;
        normalizedTileValues.set(tile, normalized);
      }
    }

    // Map normalized values to colors (add to existing colors map that already has no-value tiles)
    for (const [tile, normalizedValue] of normalizedTileValues) {
      const color = this.interpolateColor(normalizedValue, schemeConfig.colors);
      colors.set(tile, color);
    }

    return {
      colors,
      minValue,
      maxValue,
      validTileCount: tileValues.size,
    };
  }

  /**
   * Interpolate color from normalized value (0-1) using color scheme
   */
  private static interpolateColor(
    normalizedValue: number,
    colors: number[],
  ): number {
    // Clamp value to 0-1
    const value = Math.max(0, Math.min(1, normalizedValue));

    if (colors.length === 0) return 0x000000;
    if (colors.length === 1) return colors[0];

    // If value is 0 or 1, return first/last color
    if (value === 0) return colors[0];
    if (value === 1) return colors[colors.length - 1];

    // Find the segment this value falls into
    const segments = colors.length - 1;
    const segmentSize = 1 / segments;
    const segmentIndex = Math.floor(value / segmentSize);
    const localValue = (value % segmentSize) / segmentSize;

    // Get colors to interpolate between
    const color1 = colors[Math.min(segmentIndex, colors.length - 1)];
    const color2 = colors[Math.min(segmentIndex + 1, colors.length - 1)];

    return this.lerpColor(color1, color2, localValue);
  }

  /**
   * Linear interpolation between two colors
   */
  private static lerpColor(
    color1: number,
    color2: number,
    factor: number,
  ): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return (r << 16) | (g << 8) | b;
  }

  /**
   * Get parameter value as a formatted string for display
   */
  static formatValue(value: number, parameter: HeatmapParameter): string {
    const config = HEATMAP_PARAMETERS[parameter];

    // Handle special formatting based on parameter type
    switch (parameter) {
      case HeatmapParameter.SELL_PRICE:
      case HeatmapParameter.STAKE_AMOUNT:
      case HeatmapParameter.AUCTION_START_PRICE:
      case HeatmapParameter.AUCTION_FLOOR_PRICE:
        // Format large numbers with K/M suffixes and include base token symbol
        const formattedAmount = this.formatTokenAmount(value);
        return baseToken
          ? `${formattedAmount} ${baseToken.symbol}`
          : formattedAmount;

      case HeatmapParameter.LAND_AGE:
        if (value < 1) {
          return `${(value * 24).toFixed(1)}h`;
        }
        return `${value.toFixed(1)} days`;

      case HeatmapParameter.AUCTION_AGE:
        if (value < 24) {
          return `${value.toFixed(1)}h`;
        }
        return `${(value / 24).toFixed(1)} days`;

      case HeatmapParameter.LEVEL:
      case HeatmapParameter.DISTANCE_FROM_CENTER:
        return value.toFixed(0);

      case HeatmapParameter.TOKEN_TYPE:
        // Map back to token name
        const tokenNames = [
          'Empty',
          'STRK',
          'LORDS',
          'ETH',
          'PAPER',
          'BROTHER',
          'PAL',
        ];
        return tokenNames[Math.round(value)] || 'Unknown';

      default:
        return `${value.toFixed(2)}${config.unit ? ' ' + config.unit : ''}`;
    }
  }

  /**
   * Format token amounts with K/M suffixes
   */
  private static formatTokenAmount(value: number): string {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    } else {
      return value.toFixed(2);
    }
  }

  /**
   * Check if a parameter is applicable to the current tile set
   */
  static isParameterApplicable(
    tiles: LandTile[],
    parameter: HeatmapParameter,
  ): boolean {
    const config = HEATMAP_PARAMETERS[parameter];

    // Check if we have any applicable tiles
    return tiles.some((tile) => {
      const value = config.extractor(tile);
      return value !== null && !isNaN(value) && isFinite(value);
    });
  }

  /**
   * Get statistics about parameter values for given tiles
   */
  static getParameterStats(
    tiles: LandTile[],
    parameter: HeatmapParameter,
  ): {
    count: number;
    min: number;
    max: number;
    mean: number;
    median: number;
  } {
    const config = HEATMAP_PARAMETERS[parameter];
    const values: number[] = [];

    for (const tile of tiles) {
      const value = config.extractor(tile);
      if (value !== null && !isNaN(value) && isFinite(value)) {
        values.push(value);
      }
    }

    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, mean: 0, median: 0 };
    }

    values.sort((a, b) => a - b);

    const min = values[0];
    const max = values[values.length - 1];
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const median =
      values.length % 2 === 0
        ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
        : values[Math.floor(values.length / 2)];

    return { count: values.length, min, max, mean, median };
  }
}
