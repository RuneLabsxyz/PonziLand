<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import { formatDateOnly } from '$lib/utils/date';

  let {
    data,
    title,
    baseSymbol,
    quoteSymbol,
  }: {
    data: Array<{ date: string; price: number }>;
    title: string;
    baseSymbol: string;
    quoteSymbol: string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart;

  /**
   * @notice Creates and initializes the Chart.js instance
   * @dev Sets up the line chart with proper styling for dark theme
   */
  function createChart() {
    if (!canvas) return;

    const labels = data.map((d) => formatDateOnly(d.date));
    const prices = data.map((d) => 1 / d.price);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `${baseSymbol}/${quoteSymbol} Rate`,
            data: prices,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#8b5cf6',
            pointBorderColor: '#1e1e2e',
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.2,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: 'rgba(255, 255, 255, 0.8)',
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(30, 30, 46, 0.9)',
            titleColor: 'rgba(255, 255, 255, 0.9)',
            bodyColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: 'rgba(139, 92, 246, 0.5)',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.6)',
              maxRotation: 45,
              minRotation: 45,
            },
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.6)',
              callback: function (value) {
                return typeof value === 'number' ? value.toFixed(6) : value;
              },
            },
          },
        },
      },
    });
  }

  /**
   * @notice Updates the chart when data changes
   * @dev Destroys and recreates the chart to ensure clean updates
   */
  function updateChart() {
    if (chart) {
      chart.destroy();
    }
    createChart();
  }

  onMount(createChart);

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });

  $effect(() => {
    if (data && chart) {
      updateChart();
    }
  });
</script>

<div class="chart-container">
  <h3 class="text-white font-semibold mb-2">{title}</h3>
  <div class="bg-black/20 rounded-lg p-3 h-[200px]">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>
