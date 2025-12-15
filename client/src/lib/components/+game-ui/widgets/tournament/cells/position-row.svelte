<script lang="ts">
  import type { TournamentPosition } from '../tournament.service';
  import StatusCell from '../../positions/cells/status-cell.svelte';
  import TotalPnlCell from '../../positions/cells/total-pnl-cell.svelte';
  import CostCell from '../../positions/cells/cost-cell.svelte';
  import TokenInflowCell from '../../positions/cells/token-inflow-cell.svelte';
  import TokenOutflowCell from '../../positions/cells/token-outflow-cell.svelte';
  import { locationToCoordinates } from '$lib/utils';

  interface Props {
    position: TournamentPosition;
  }

  let { position }: Props = $props();

  const coordinates = $derived(locationToCoordinates(position.land_location));
</script>

<div
  class="grid grid-cols-[60px_70px_90px_90px_90px_90px_90px] gap-1 px-3 py-1.5 text-xs border-b border-gray-800/50 hover:bg-gray-800/20"
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
