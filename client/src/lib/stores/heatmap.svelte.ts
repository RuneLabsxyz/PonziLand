import {
  HeatmapParameter,
  HeatmapColorScheme,
  DEFAULT_HEATMAP_CONFIG,
  HEATMAP_PARAMETERS,
} from '$lib/components/+game-ui/widgets/heatmap/heatmap.config';

export interface HeatmapState {
  enabled: boolean;
  parameter: HeatmapParameter;
  colorScheme: HeatmapColorScheme;
  opacity: number;
  showLegend: boolean;
  // Computed values for display
  minValue?: number;
  maxValue?: number;
  validTileCount?: number;
}

export class HeatmapStore {
  enabled = $state<boolean>(DEFAULT_HEATMAP_CONFIG.enabled);
  parameter = $state<HeatmapParameter>(DEFAULT_HEATMAP_CONFIG.parameter);
  colorScheme = $state<HeatmapColorScheme>(DEFAULT_HEATMAP_CONFIG.colorScheme);
  opacity = $state<number>(DEFAULT_HEATMAP_CONFIG.opacity);
  showLegend = $state<boolean>(DEFAULT_HEATMAP_CONFIG.showLegend);

  // Computed values for display
  minValue = $state<number | undefined>(undefined);
  maxValue = $state<number | undefined>(undefined);
  validTileCount = $state<number | undefined>(undefined);

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setParameter(parameter: HeatmapParameter): void {
    this.parameter = parameter;
    // Set default color scheme for the parameter
    this.colorScheme = HEATMAP_PARAMETERS[parameter].defaultColorScheme;
  }

  setColorScheme(colorScheme: HeatmapColorScheme): void {
    this.colorScheme = colorScheme;
  }

  setOpacity(opacity: number): void {
    this.opacity = Math.max(0, Math.min(1, opacity));
  }

  setShowLegend(showLegend: boolean): void {
    this.showLegend = showLegend;
  }

  // Update computed values after calculations
  updateStats(
    minValue: number,
    maxValue: number,
    validTileCount: number,
  ): void {
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.validTileCount = validTileCount;
  }

  // Reset to defaults
  reset(): void {
    this.enabled = DEFAULT_HEATMAP_CONFIG.enabled;
    this.parameter = DEFAULT_HEATMAP_CONFIG.parameter;
    this.colorScheme = DEFAULT_HEATMAP_CONFIG.colorScheme;
    this.opacity = DEFAULT_HEATMAP_CONFIG.opacity;
    this.showLegend = DEFAULT_HEATMAP_CONFIG.showLegend;
    this.minValue = undefined;
    this.maxValue = undefined;
    this.validTileCount = undefined;
  }

  // Get current parameter configuration
  getCurrentParameterConfig() {
    return HEATMAP_PARAMETERS[this.parameter];
  }

  // Get all available parameters for current land types
  getAvailableParameters(
    hasBuildingLands: boolean,
    hasAuctionLands: boolean,
  ): HeatmapParameter[] {
    return Object.values(HeatmapParameter).filter((param) => {
      const config = HEATMAP_PARAMETERS[param];
      return (
        (hasBuildingLands && config.applicableToBuilding) ||
        (hasAuctionLands && config.applicableToAuction)
      );
    });
  }
}

// Export the singleton instance
export const heatmapStore = new HeatmapStore();
