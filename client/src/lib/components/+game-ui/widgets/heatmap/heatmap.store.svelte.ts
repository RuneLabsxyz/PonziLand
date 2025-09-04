import {
  HeatmapParameter,
  HeatmapColorScheme,
  DEFAULT_HEATMAP_CONFIG,
  HEATMAP_PARAMETERS,
} from './heatmap.config';

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

// Export the $state rune directly
export const heatmapStore = $state<HeatmapState>({
  ...DEFAULT_HEATMAP_CONFIG,
});

// Helper functions for the store
export function setHeatmapEnabled(enabled: boolean): void {
  heatmapStore.enabled = enabled;
}

export function setHeatmapParameter(parameter: HeatmapParameter): void {
  heatmapStore.parameter = parameter;
  // Set default color scheme for the parameter
  heatmapStore.colorScheme = HEATMAP_PARAMETERS[parameter].defaultColorScheme;
}

export function setHeatmapColorScheme(colorScheme: HeatmapColorScheme): void {
  heatmapStore.colorScheme = colorScheme;
}

export function setHeatmapOpacity(opacity: number): void {
  heatmapStore.opacity = Math.max(0, Math.min(1, opacity));
}

export function setHeatmapShowLegend(showLegend: boolean): void {
  heatmapStore.showLegend = showLegend;
}

// Update computed values after calculations
export function updateHeatmapStats(
  minValue: number,
  maxValue: number,
  validTileCount: number,
): void {
  heatmapStore.minValue = minValue;
  heatmapStore.maxValue = maxValue;
  heatmapStore.validTileCount = validTileCount;
}

// Reset to defaults
export function resetHeatmapStore(): void {
  Object.assign(heatmapStore, DEFAULT_HEATMAP_CONFIG);
}

// Get current parameter configuration
export function getCurrentParameterConfig() {
  return HEATMAP_PARAMETERS[heatmapStore.parameter];
}

// Get all available parameters for current land types
export function getAvailableParameters(
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
