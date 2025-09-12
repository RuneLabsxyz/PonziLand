<script lang="ts">
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import type { Token } from '$lib/interfaces';

  let {
    landCostInBaseToken,
    netYieldPerHourInBaseToken,
    nukeTimeSeconds,
    paybackTimeSeconds,
    baseToken,
    nbNeighbors,
    sellAmountInBaseToken,
  }: {
    landCostInBaseToken?: CurrencyAmount;
    netYieldPerHourInBaseToken?: CurrencyAmount;
    nukeTimeSeconds: number;
    paybackTimeSeconds: number;
    baseToken?: Token;
    nbNeighbors: number;
    sellAmountInBaseToken?: CurrencyAmount;
  } = $props();

  /**
   * Generates data points for the profit evolution chart.
   * Shows cumulative profit/loss over time starting from -landCost.
   */
  let chartData = $derived.by(() => {
    if (!landCostInBaseToken || !netYieldPerHourInBaseToken || !baseToken) {
      return [];
    }

    const landCost = Number(landCostInBaseToken.rawValue());
    const hourlyProfit = Number(netYieldPerHourInBaseToken.rawValue());
    const sellAmount = sellAmountInBaseToken ? Number(sellAmountInBaseToken.rawValue()) : 0;
    
    // Determine chart time range (max of nuke time or payback time)
    const nukeHours = nukeTimeSeconds > 0 && nukeTimeSeconds !== Infinity ? nukeTimeSeconds / 3600 : 0;
    const paybackHours = paybackTimeSeconds > 0 && paybackTimeSeconds !== Infinity ? paybackTimeSeconds / 3600 : 0;
    
    // Use the maximum of the two times, with a minimum of 24 hours for visibility
    let maxTimeHours = Math.max(nukeHours, paybackHours);
    
    // If both are 0 or invalid, default to 7 days for a reasonable view
    if (maxTimeHours === 0) {
      maxTimeHours = 24 * 7;
    }
    
    // Extend the view by 20% beyond the furthest event for better visualization
    const timeHours = maxTimeHours * 1.2;
    const dataPoints = 100; // Number of points on the chart
    const hourStep = timeHours / dataPoints;

    const points = [];
    
    for (let i = 0; i <= dataPoints; i++) {
      const hour = i * hourStep;
      const cumulativeProfit = -landCost + (hourlyProfit * hour);
      
      // If selling at this time: accumulated yield + sell amount - original cost
      const sellProfit = (hourlyProfit * hour) + sellAmount - landCost;
      
      points.push({
        time: hour,
        profit: cumulativeProfit,
        sellProfit: sellProfit,
        timeLabel: formatTimeLabel(hour),
      });
    }

    return points;
  });

  /**
   * Chart dimensions and scales
   */
  let chartConfig = $derived.by(() => {
    if (!chartData.length) return null;

    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 40, bottom: 40, left: 60 };

    const maxTime = Math.max(...chartData.map(d => d.time));
    
    // Consider both regular profit and sell profit for domain calculation
    const allProfits = chartData.flatMap(d => [d.profit, d.sellProfit]);
    const minProfit = Math.min(...allProfits);
    const maxProfit = Math.max(...allProfits, 0);

    // Add some padding to the profit range
    const profitRange = maxProfit - minProfit;
    const paddedMinProfit = minProfit - profitRange * 0.1;
    const paddedMaxProfit = maxProfit + profitRange * 0.1;

    return {
      width,
      height,
      padding,
      scales: {
        x: (time: number) => padding.left + ((time / maxTime) * (width - padding.left - padding.right)),
        y: (profit: number) => padding.top + ((paddedMaxProfit - profit) / (paddedMaxProfit - paddedMinProfit)) * (height - padding.top - padding.bottom),
      },
      domain: {
        time: [0, maxTime],
        profit: [paddedMinProfit, paddedMaxProfit],
      },
    };
  });

  /**
   * Creates SVG path for the profit line
   */
  let profitPath = $derived.by(() => {
    if (!chartData.length || !chartConfig) return '';

    const pathCommands = chartData.map((point, index) => {
      const x = chartConfig.scales.x(point.time);
      const y = chartConfig.scales.y(point.profit);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    return pathCommands.join(' ');
  });

  /**
   * Creates SVG path for the sell profit line (dotted)
   */
  let sellProfitPath = $derived.by(() => {
    if (!chartData.length || !chartConfig || !sellAmountInBaseToken) return '';

    const pathCommands = chartData.map((point, index) => {
      const x = chartConfig.scales.x(point.time);
      const y = chartConfig.scales.y(point.sellProfit);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    return pathCommands.join(' ');
  });

  /**
   * Special marker positions
   */
  let markers = $derived.by(() => {
    if (!chartConfig || !chartData.length) return [];

    const markers = [];

    // Nuke time marker
    if (nukeTimeSeconds > 0 && nukeTimeSeconds !== Infinity) {
      const nukeHours = nukeTimeSeconds / 3600;
      if (nukeHours <= chartConfig.domain.time[1]) {
        markers.push({
          type: 'nuke',
          x: chartConfig.scales.x(nukeHours),
          label: 'Nuke Time',
          color: '#ef4444',
        });
      }
    }

    // Hold payback time marker  
    if (paybackTimeSeconds > 0 && paybackTimeSeconds !== Infinity) {
      const paybackHours = paybackTimeSeconds / 3600;
      if (paybackHours <= chartConfig.domain.time[1]) {
        markers.push({
          type: 'payback',
          x: chartConfig.scales.x(paybackHours),
          label: 'Hold Break Even',
          color: '#22c55e',
        });
      }
    }

    // Sell break even markers
    if (sellAmountInBaseToken && chartData.length > 0) {
      // Find all zero crossings for sell profit
      const sellCrossings = [];
      
      for (let i = 0; i < chartData.length - 1; i++) {
        const current = chartData[i];
        const next = chartData[i + 1];
        
        // Check if sell profit crosses zero between these two points
        if ((current.sellProfit <= 0 && next.sellProfit > 0) || 
            (current.sellProfit > 0 && next.sellProfit <= 0)) {
          // Linear interpolation to find exact crossing point
          const ratio = Math.abs(current.sellProfit) / Math.abs(next.sellProfit - current.sellProfit);
          const crossingHours = current.time + (ratio * (next.time - current.time));
          
          const isGoingPositive = current.sellProfit <= 0 && next.sellProfit > 0;
          
          sellCrossings.push({
            hours: crossingHours,
            type: isGoingPositive ? 'breakeven' : 'limit',
          });
        }
      }
      
      // Add markers for each crossing within the chart domain
      sellCrossings.forEach((crossing, index) => {
        if (crossing.hours <= chartConfig.domain.time[1]) {
          markers.push({
            type: `sell-${crossing.type}`,
            x: chartConfig.scales.x(crossing.hours),
            label: crossing.type === 'breakeven' ? 'Sell Break Even' : 'Sell Limit',
            color: crossing.type === 'breakeven' ? '#f59e0b' : '#f97316',
          });
        }
      });
    }

    return markers;
  });

  function formatTimeLabel(hours: number): string {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d`;
    }
  }

  function formatAxisLabel(hours: number): string {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else if (hours < 24 * 7) {
      return `${Math.round(hours / 24)}d`;
    } else if (hours < 24 * 30) {
      return `${Math.round(hours / 24 / 7)}w`;
    } else {
      return `${Math.round(hours / 24 / 30)}m`;
    }
  }
</script>

{#if chartConfig && chartData.length}
  <div class="w-full bg-gray-900 p-4 rounded-lg">
    <h3 class="text-sm font-ponzi-number mb-2">
      Profit Evolution - {nbNeighbors} neighbors
    </h3>
    
    <svg width={chartConfig.width} height={chartConfig.height} class="overflow-visible">
      <!-- Grid lines -->
      <defs>
        <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#374151" stroke-width="0.5" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      
      <!-- Zero line -->
      <line
        x1={chartConfig.padding.left}
        x2={chartConfig.width - chartConfig.padding.right}
        y1={chartConfig.scales.y(0)}
        y2={chartConfig.scales.y(0)}
        stroke="#6b7280"
        stroke-width="1"
        stroke-dasharray="2,2"
      />
      
      <!-- Profit line -->
      <path
        d={profitPath}
        fill="none"
        stroke={netYieldPerHourInBaseToken && netYieldPerHourInBaseToken.rawValue().isNegative() 
          ? '#ef4444' 
          : '#22c55e'}
        stroke-width="2"
      />
      
      <!-- Sell profit line (dotted) -->
      {#if sellProfitPath}
        <path
          d={sellProfitPath}
          fill="none"
          stroke="#f59e0b"
          stroke-width="2"
          stroke-dasharray="4,4"
        />
      {/if}
      
      <!-- Markers -->
      {#each markers as marker}
        <line
          x1={marker.x}
          x2={marker.x}
          y1={chartConfig.padding.top}
          y2={chartConfig.height - chartConfig.padding.bottom}
          stroke={marker.color}
          stroke-width="2"
          stroke-dasharray="4,4"
        />
        <text
          x={marker.x}
          y={chartConfig.padding.top - 5}
          text-anchor="middle"
          class="text-xs fill-current"
          style="color: {marker.color}"
        >
          {marker.label}
        </text>
      {/each}
      
      <!-- Y-axis labels -->
      {#each [chartConfig.domain.profit[0], 0, chartConfig.domain.profit[1]] as profitValue}
        <text
          x={chartConfig.padding.left - 10}
          y={chartConfig.scales.y(profitValue) + 4}
          text-anchor="end"
          class="text-xs fill-gray-400"
        >
          {profitValue.toFixed(0)}
        </text>
      {/each}
      
      <!-- X-axis labels -->
      {#each [0, chartConfig.domain.time[1] / 4, chartConfig.domain.time[1] / 2, chartConfig.domain.time[1] * 3/4, chartConfig.domain.time[1]] as timeValue}
        <text
          x={chartConfig.scales.x(timeValue)}
          y={chartConfig.height - chartConfig.padding.bottom + 15}
          text-anchor="middle"
          class="text-xs fill-gray-400"
        >
          {formatAxisLabel(timeValue)}
        </text>
      {/each}
      
      <!-- Axis labels -->
      <text
        x={chartConfig.width / 2}
        y={chartConfig.height - 5}
        text-anchor="middle"
        class="text-xs fill-gray-400"
      >
        Time
      </text>
      
      <text
        x={15}
        y={chartConfig.height / 2}
        text-anchor="middle"
        transform="rotate(-90, 15, {chartConfig.height / 2})"
        class="text-xs fill-gray-400"
      >
        Profit ({baseToken?.symbol})
      </text>
    </svg>
    
    <!-- Legend -->
    <div class="flex flex-wrap gap-4 mt-2 text-xs">
      <div class="flex items-center gap-1">
        <div class="w-3 h-0.5 bg-green-500"></div>
        <span class="text-gray-400">Hold Profit</span>
      </div>
      {#if sellAmountInBaseToken}
        <div class="flex items-center gap-1">
          <div class="w-3 h-0.5 bg-yellow-500 border-dashed"></div>
          <span class="text-yellow-500">Sell Profit</span>
        </div>
      {/if}
      <div class="flex items-center gap-1">
        <div class="w-3 h-0.5 bg-red-500 border-dashed"></div>
        <span class="text-red-500">Nuke Time</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-0.5 bg-green-500 border-dashed"></div>
        <span class="text-green-500">Hold Break Even</span>
      </div>
      {#if sellAmountInBaseToken}
        <div class="flex items-center gap-1">
          <div class="w-3 h-0.5 bg-yellow-500 border-dashed"></div>
          <span class="text-yellow-500">Sell Break Even</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-0.5 bg-orange-500 border-dashed"></div>
          <span class="text-orange-500">Sell Limit</span>
        </div>
      {/if}
    </div>
  </div>
{/if}