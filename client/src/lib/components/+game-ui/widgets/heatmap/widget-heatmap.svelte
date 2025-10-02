<script lang="ts">
  import { HeatmapCalculator } from './heatmap-calculator';
  import {
    COLOR_SCHEMES,
    HEATMAP_PARAMETERS,
    HeatmapColorScheme,
    HeatmapParameter,
  } from './heatmap.config';
  import { heatmapStore } from '$lib/stores/heatmap.svelte';
  import { Label } from '$lib/components/ui/label';
  import { LandTile } from '$lib/components/+game-map/three/landTile';
  import { landStore } from '$lib/stores/store.svelte';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from '$lib/components/ui/select';
  import { Slider } from '$lib/components/ui/slider';
  import DollarSign from 'lucide-svelte/icons/dollar-sign';
  import BarChart3 from 'lucide-svelte/icons/bar-chart-3';
  import Coins from 'lucide-svelte/icons/coins';
  import Clock from 'lucide-svelte/icons/clock';
  import BadgePercent from 'lucide-svelte/icons/badge-percent';
  import Gavel from 'lucide-svelte/icons/gavel';
  import TrendingUp from 'lucide-svelte/icons/trending-up';
  import Timer from 'lucide-svelte/icons/timer';
  import MapPin from 'lucide-svelte/icons/map-pin';
  import { Button } from '$lib/components/ui/button';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { onMount } from 'svelte';

  // Available parameters - show all for now (can be filtered later based on data availability)
  let availableParameters = $derived(Object.values(HeatmapParameter));

  // Get land tiles for statistics calculation
  let visibleLandTiles: LandTile[] = $state([]);

  onMount(() => {
    landStore.getAllLands().subscribe((tiles) => {
      visibleLandTiles = tiles.map((tile) => {
        let tokenSymbol = 'empty';
        let skin = 'default';

        if (BuildingLand.is(tile)) {
          tokenSymbol = tile?.token?.symbol ?? 'empty';
          skin = tile?.token?.skin ?? 'empty';
        }

        if (AuctionLand.is(tile)) {
          tokenSymbol = 'auction';
          skin = 'auction';
        }

        const gridX = tile.location.x;
        const gridY = tile.location.y;

        return new LandTile(
          [gridX, 1, gridY],
          tokenSymbol,
          skin,
          tile.level,
          tile,
        );
      });
    });
  });

  // Current parameter configuration
  let currentParamConfig = $derived(heatmapStore.getCurrentParameterConfig());

  // Parameter options for the select component
  let parameterOptions = $derived(
    availableParameters.map((param) => {
      const config = HEATMAP_PARAMETERS[param];
      return {
        value: param,
        label: config.label,
        description: config.description,
        unit: config.unit,
      };
    }),
  );

  // Color scheme options for the select component
  let colorSchemeOptions = $derived(
    Object.values(HeatmapColorScheme).map((scheme) => {
      const config = COLOR_SCHEMES[scheme];
      return {
        value: scheme,
        label: config.label,
        preview: getColorSchemePreview(scheme),
      };
    }),
  );

  // Parameter statistics for display - get proper stats from calculator
  let paramStats = $derived.by(() => {
    if (!heatmapStore.enabled || !visibleLandTiles) {
      return null;
    }

    // Get proper statistics using the calculator
    return HeatmapCalculator.getParameterStats(
      visibleLandTiles,
      heatmapStore.parameter,
    );
  });

  // Format values for display
  function formatDisplayValue(
    value: number,
    parameter: HeatmapParameter,
  ): string {
    return HeatmapCalculator.formatValue(value, parameter);
  }

  // Color scheme preview
  function getColorSchemePreview(scheme: HeatmapColorScheme): string {
    const colors = COLOR_SCHEMES[scheme].colors;
    return `linear-gradient(to right, ${colors.map((c) => `#${c.toString(16).padStart(6, '0')}`).join(', ')})`;
  }

  // Create color legend gradient for current scheme
  let colorLegendGradient = $derived.by(() => {
    if (!heatmapStore.enabled || !heatmapStore.colorScheme) return '';
    return getColorSchemePreview(heatmapStore.colorScheme);
  });

  // Generate legend tick marks and labels
  let legendTicks = $derived.by(() => {
    if (!paramStats || paramStats.count === 0) return [];

    const { min, max } = paramStats;
    const range = max - min;

    // Generate 4 evenly spaced ticks
    const ticks = [];
    const NUMBER_OF_TICKS = 2;
    for (let i = 0; i <= NUMBER_OF_TICKS; i++) {
      const value = min + (range * i) / NUMBER_OF_TICKS;
      const percentage = (i / NUMBER_OF_TICKS) * 100;
      ticks.push({
        value,
        percentage,
        label: formatDisplayValue(value, heatmapStore.parameter),
      });
    }

    return ticks;
  });

  // Get icon component for parameter
  function getParameterIcon(parameter: HeatmapParameter) {
    switch (parameter) {
      case HeatmapParameter.SELL_PRICE:
        return DollarSign;
      case HeatmapParameter.LEVEL:
        return BarChart3;
      case HeatmapParameter.STAKE_AMOUNT:
        return Coins;
      case HeatmapParameter.LAND_AGE:
        return Clock;
      case HeatmapParameter.TOKEN_TYPE:
        return BadgePercent;
      case HeatmapParameter.AUCTION_START_PRICE:
        return Gavel;
      case HeatmapParameter.AUCTION_FLOOR_PRICE:
        return TrendingUp;
      case HeatmapParameter.AUCTION_AGE:
        return Timer;
      case HeatmapParameter.DISTANCE_FROM_CENTER:
        return MapPin;
      default:
        return BarChart3;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <!-- Enable/Disable Toggle -->
  <div class="flex items-center justify-between">
    <Label class="font-ponzi-number stroke-3d-black">Enable DataMaps</Label>
    <Button onclick={() => heatmapStore.setEnabled(!heatmapStore.enabled)}>
      {heatmapStore.enabled ? 'ON' : 'OFF'}
    </Button>
  </div>

  {#if heatmapStore.enabled}
    <hr />

    <!-- Parameter Selection -->
    <div class="space-y-2">
      <Label class="font-ponzi-number stroke-3d-black">Parameter</Label>
      <Select
        onSelectedChange={(v) =>
          heatmapStore.setParameter(v?.value as HeatmapParameter)}
      >
        <SelectTrigger class="w-full" variant="swap">
          {#if heatmapStore.parameter}
            {@const selectedParam = parameterOptions.find(
              (opt) => opt.value === heatmapStore.parameter,
            )}
            {#if selectedParam}
              {@const IconComponent = getParameterIcon(selectedParam.value)}
              <div class="flex items-center gap-2 text-left">
                <IconComponent class="w-4 h-4 flex-shrink-0" />
                <div class="flex flex-col">
                  <span>{selectedParam.label}</span>
                  {#if selectedParam.unit}
                    <span class="text-xs text-muted-foreground"
                      >({selectedParam.unit})</span
                    >
                  {/if}
                </div>
              </div>
            {/if}
          {:else}
            <span class="text-muted-foreground">Select parameter</span>
          {/if}
        </SelectTrigger>
        <SelectContent variant="swap">
          {#each parameterOptions as option}
            {@const IconComponent = getParameterIcon(option.value)}
            <SelectItem value={option.value} variant="swap">
              <div class="flex items-start gap-2">
                <IconComponent class="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div class="flex flex-col">
                  <span>{option.label}</span>
                  {#if option.description}
                    <span class="text-xs">
                      {option.description}
                    </span>
                  {/if}
                  {#if option.unit}
                    <span class="text-xs text-muted-foreground">
                      ({option.unit})
                    </span>
                  {/if}
                </div>
              </div>
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>

      {#if currentParamConfig}
        <p class="text-sm text-muted-foreground">
          {currentParamConfig.description}
        </p>
      {/if}
    </div>

    <!-- Color Scheme Selection -->
    <div class="space-y-2">
      <Label class="font-ponzi-number stroke-3d-black">Color Scheme</Label>
      <Select
        onSelectedChange={(v) =>
          heatmapStore.setColorScheme(v?.value as HeatmapColorScheme)}
      >
        <SelectTrigger class="w-full" variant="swap">
          {#if heatmapStore.colorScheme}
            {@const selectedScheme = colorSchemeOptions.find(
              (opt) => opt.value === heatmapStore.colorScheme,
            )}
            {#if selectedScheme}
              <div class="flex items-center gap-3">
                {#if selectedScheme.preview}
                  <div
                    class="w-6 h-4 rounded border border-border flex-shrink-0"
                    style="background: {selectedScheme.preview}"
                  ></div>
                {/if}
                <span>{selectedScheme.label}</span>
              </div>
            {/if}
          {:else}
            <span class="text-muted-foreground">Select color scheme</span>
          {/if}
        </SelectTrigger>
        <SelectContent variant="swap">
          {#each colorSchemeOptions as option}
            <SelectItem value={option.value} variant="swap">
              <div class="flex items-center gap-3">
                {#if option.preview}
                  <div
                    class="w-6 h-4 rounded border border-border flex-shrink-0"
                    style="background: {option.preview}"
                  ></div>
                {/if}
                <span>{option.label}</span>
              </div>
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>

    <!-- Opacity Slider -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label for="opacity-slider" class="font-ponzi-number stroke-3d-black"
          >Opacity</Label
        >
        <span class="text-sm text-muted-foreground"
          >{Math.round(heatmapStore.opacity * 100)}%</span
        >
      </div>
      <Slider
        id="opacity-slider"
        type="single"
        value={heatmapStore.opacity}
        onValueChange={(value) => heatmapStore.setOpacity(value)}
        max={1}
        min={0.1}
        step={0.05}
        class="w-full"
      />
    </div>

    <!-- Color Legend and Statistics -->
    {#if paramStats && paramStats.count > 0}
      <hr />

      <!-- Color Legend -->
      <div class="space-y-2">
        <Label class="font-ponzi-number stroke-3d-black">Color Legend</Label>
        <div class="relative">
          <!-- Gradient bar -->
          <div
            class="w-full h-4 rounded border border-border"
            style="background: {colorLegendGradient}"
          ></div>

          <!-- Tick marks and labels -->
          <div class="relative mt-1 flex justify-between">
            {#each legendTicks as tick, i}
              {@const isFirst = i === 0}
              {@const isLast = i === legendTicks.length - 1}
              <div
                class="flex flex-col text-xs {isFirst
                  ? 'items-start'
                  : isLast
                    ? 'items-end'
                    : 'items-center'}"
              >
                <div class="w-0.5 h-2 bg-border mb-1"></div>
                <span class="font-mono text-muted-foreground whitespace-nowrap">
                  {tick.label}
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <hr />

      <!-- Statistics -->
      <div class="space-y-3">
        <Label class="font-ponzi-number stroke-3d-black">Data Summary</Label>

        <!-- Key Stats in a clean grid -->
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="bg-secondary/20 rounded p-2">
            <div class="text-xs text-muted-foreground uppercase tracking-wide">
              Tiles
            </div>
            <div class="font-ponzi-number text-lg">{paramStats.count}</div>
          </div>
          <div class="bg-secondary/20 rounded p-2">
            <div class="text-xs text-muted-foreground uppercase tracking-wide">
              Range
            </div>
            <div class="text-xs">
              {formatDisplayValue(paramStats.min, heatmapStore.parameter)} →
              {formatDisplayValue(paramStats.max, heatmapStore.parameter)}
            </div>
          </div>
        </div>

        <!-- Additional Stats -->
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Mean:</span>
            <span class="text-xs">
              {formatDisplayValue(paramStats.mean, heatmapStore.parameter)}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Median:</span>
            <span class="text-xs">
              {formatDisplayValue(paramStats.median, heatmapStore.parameter)}
            </span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Reset Button -->
    <hr />
    <button
      class="w-full justify-center flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm font-ponzi-number stroke-3d-black"
      onclick={() => heatmapStore.reset()}
    >
      Reset to Defaults
    </button>
  {/if}
</div>
