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

  // Available parameters - show all for now (can be filtered later based on data availability)
  let availableParameters = $derived(Object.values(HeatmapParameter));

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

  // Parameter statistics for display - show basic stats from the store
  let paramStats = $derived.by(() => {
    if (!heatmapStore.enabled) {
      return null;
    }

    // Use the stats from the heatmap store if available
    if (
      heatmapStore.minValue !== undefined &&
      heatmapStore.maxValue !== undefined
    ) {
      return {
        count: heatmapStore.validTileCount ?? 0,
        min: heatmapStore.minValue,
        max: heatmapStore.maxValue,
        mean: (heatmapStore.minValue + heatmapStore.maxValue) / 2, // Simple approximation
        median: (heatmapStore.minValue + heatmapStore.maxValue) / 2, // Simple approximation
      };
    }

    return null;
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

<div class="flex flex-col gap-4 p-4 min-w-[320px] min-h-0 h-full">
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

    <!-- Statistics Display -->
    {#if paramStats && paramStats.count > 0}
      <hr />

      <div class="space-y-2">
        <Label class="font-ponzi-number stroke-3d-black">Statistics</Label>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Count:</span>
            <span class="bg-secondary px-2 py-1 rounded text-xs"
              >{paramStats.count}</span
            >
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Range:</span>
            <span class="font-mono text-xs">
              {formatDisplayValue(paramStats.min, heatmapStore.parameter)} -
              {formatDisplayValue(paramStats.max, heatmapStore.parameter)}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Mean:</span>
            <span class="font-mono text-xs">
              {formatDisplayValue(paramStats.mean, heatmapStore.parameter)}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Median:</span>
            <span class="font-mono text-xs">
              {formatDisplayValue(paramStats.median, heatmapStore.parameter)}
            </span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Legend Toggle -->
    <hr />

    <!-- Reset Button -->
    <button
      class="w-full justify-center flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm font-ponzi-number stroke-3d-black"
      onclick={() => heatmapStore.reset()}
    >
      Reset to Defaults
    </button>
  {/if}
</div>
