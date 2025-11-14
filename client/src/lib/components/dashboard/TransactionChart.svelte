<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import { formatDateOnly } from '$lib/utils/date';

  let { transactions }: { transactions: Array<{ date: string }> } = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart;

  /**
   * @notice Groups transactions by day and creates count data
   */
  function getDailyTransactions() {
    const dailyCounts = new Map();

    transactions.forEach((tx) => {
      const date = formatDateOnly(tx.date);
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    });

    return Array.from(dailyCounts.entries()).sort(
      ([dateA], [dateB]) =>
        new Date(dateA).getTime() - new Date(dateB).getTime(),
    );
  }

  /**
   * @notice Creates and initializes the Chart.js instance
   */
  function createChart() {
    if (!canvas) return;

    const dailyData = getDailyTransactions();
    const labels = dailyData.map(([date]) => date);
    const counts = dailyData.map(([, count]) => count);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Daily Transactions',
            data: counts,
            backgroundColor: 'rgba(139, 92, 246, 0.7)',
            borderColor: '#8b5cf6',
            borderWidth: 1,
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
              stepSize: 1,
            },
            beginAtZero: true,
          },
        },
      },
    });
  }

  /**
   * @notice Updates the chart when data changes
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
    if (transactions && chart) {
      updateChart();
    }
  });
</script>

<div class="chart-container">
  <h3 class="text-white font-semibold mb-2">Daily Transaction Volume</h3>
  <div class="bg-black/20 rounded-lg p-3 h-[200px]">
    <canvas bind:this={canvas}></canvas>
  </div>
</div>
