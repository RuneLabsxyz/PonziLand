<script lang="ts">
  import { getFullTokenInfo } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
  }

  let { position }: Props = $props();

  const inflowEntries = Object.entries(position.token_inflows);
  const outflowEntries = Object.entries(position.token_outflows);
</script>

<div class="grid grid-cols-2 gap-4 mt-2">
  <div>
    <div class="flex justify-between items-center mb-2">
      <h4 class="text-gray-400">Token Inflows</h4>
    </div>
    {#if inflowEntries.length > 0}
      <div class="space-y-1">
        {#each inflowEntries as [token, amount]}
          {@const fullTokenInfo = getFullTokenInfo(token)}
          {#if fullTokenInfo}
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2 min-w-0">
                <div
                  class="h-5 w-5 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center"
                >
                  <span class="text-[8px]"
                    >{fullTokenInfo.token.symbol.slice(0, 3)}</span
                  >
                </div>
                <span class="text-gray-400 truncate" title={token}>
                  {fullTokenInfo.token.symbol}
                </span>
              </div>
              <span class="text-green-400 ml-2 flex-shrink-0">
                +{CurrencyAmount.fromUnscaled(
                  amount,
                  fullTokenInfo.token,
                ).toString()}
              </span>
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="text-gray-600">No inflows</div>
    {/if}
  </div>

  <div>
    <div class="flex justify-between items-center mb-2">
      <h4 class="text-gray-400">Token Outflows</h4>
    </div>
    {#if outflowEntries.length > 0}
      <div class="space-y-1">
        {#each outflowEntries as [token, amount]}
          {@const fullTokenInfo = getFullTokenInfo(token)}
          {#if fullTokenInfo}
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2 min-w-0">
                <div
                  class="h-5 w-5 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center"
                >
                  <span class="text-[8px]"
                    >{fullTokenInfo.token.symbol.slice(0, 3)}</span
                  >
                </div>
                <span class="text-gray-400 truncate" title={token}>
                  {fullTokenInfo.token.symbol}
                </span>
              </div>
              <span class="text-red-400 ml-2 flex-shrink-0">
                -{CurrencyAmount.fromUnscaled(
                  amount,
                  fullTokenInfo.token,
                ).toString()}
              </span>
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="text-gray-600">No outflows</div>
    {/if}
  </div>
</div>
