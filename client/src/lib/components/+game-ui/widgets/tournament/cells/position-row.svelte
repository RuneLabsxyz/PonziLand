<script lang="ts">
  import type { TournamentPosition } from '../tournament.service';
  import StatusCell from '../../positions/cells/status-cell.svelte';
  import TotalPnlCell from '../../positions/cells/total-pnl-cell.svelte';
  import CostCell from '../../positions/cells/cost-cell.svelte';
  import TokenInflowCell from '../../positions/cells/token-inflow-cell.svelte';
  import TokenOutflowCell from '../../positions/cells/token-outflow-cell.svelte';
  import DateCell from '../../positions/cells/date-cell.svelte';
  import RoiCell from '../../positions/cells/roi-cell.svelte';
  import { locationToCoordinates } from '$lib/utils';

  interface Props {
    position: TournamentPosition;
    /** Show all columns (true) or simplified view without buy/sell (false) */
    showFullDetails?: boolean;
  }

  let { position, showFullDetails = true }: Props = $props();

  const coordinates = $derived(locationToCoordinates(position.land_location));

  // Grid column definitions
  const fullGridCols = 'grid-cols-[50px_60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr]';
  const simplifiedGridCols = 'grid-cols-[50px_60px_1fr_1fr_1fr_1fr]';
</script>

{#if showFullDetails}
  <div
    class="grid {fullGridCols} gap-2 px-3 py-1.5 text-xs border-b border-gray-800/50 hover:bg-gray-800/20"
  >
    <!-- Location -->
    <div class="font-ponzi-number text-gray-300">
      ({coordinates.x}, {coordinates.y})
    </div>

    <!-- Status -->
    <div>
      <StatusCell {position} />
    </div>

    <!-- PnL (without share button) -->
    <div class="flex justify-end">
      <TotalPnlCell {position} showShareButton={false} showPercentage={false} />
    </div>

    <!-- ROI -->
    <div class="flex justify-end">
      <RoiCell {position} />
    </div>

    <!-- Bought Date -->
    <div class="flex justify-end">
      <DateCell
        dateString={position.time_bought}
        buyTokenUsed={position.buy_token_used}
        variant="buy"
      />
    </div>

    <!-- Close Date -->
    <div class="flex justify-end">
      <DateCell dateString={position.close_date} variant="close" {position} />
    </div>

    <!-- Buy Cost -->
    <div class="flex justify-end">
      <CostCell
        cost={position.buy_cost_token}
        tokenAddress={position.buy_token_used}
        variant="buy"
      />
    </div>

    <!-- Sold For -->
    <div class="flex justify-end">
      {#if position.sale_revenue_token}
        <CostCell
          cost={position.sale_revenue_token}
          tokenAddress={position.sale_token_used}
          variant="sell"
        />
      {:else}
        <span class="text-gray-500">-</span>
      {/if}
    </div>

    <!-- Token Inflows -->
    <div class="flex justify-end">
      <TokenInflowCell {position} />
    </div>

    <!-- Token Outflows -->
    <div class="flex justify-end">
      <TokenOutflowCell {position} />
    </div>
  </div>
{:else}
  <!-- Simplified view - no buy/sell columns -->
  <div
    class="grid {simplifiedGridCols} gap-2 px-3 py-1.5 text-xs border-b border-gray-800/50 hover:bg-gray-800/20"
  >
    <!-- Location -->
    <div class="font-ponzi-number text-gray-300">
      ({coordinates.x}, {coordinates.y})
    </div>

    <!-- Status -->
    <div>
      <StatusCell {position} />
    </div>

    <!-- Bought Date -->
    <div class="flex justify-end">
      <DateCell
        dateString={position.time_bought}
        buyTokenUsed={position.buy_token_used}
        variant="buy"
      />
    </div>

    <!-- Close Date -->
    <div class="flex justify-end">
      <DateCell dateString={position.close_date} variant="close" {position} />
    </div>

    <!-- Token Inflows -->
    <div class="flex justify-end">
      <TokenInflowCell {position} />
    </div>

    <!-- Token Outflows -->
    <div class="flex justify-end">
      <TokenOutflowCell {position} />
    </div>
  </div>
{/if}
