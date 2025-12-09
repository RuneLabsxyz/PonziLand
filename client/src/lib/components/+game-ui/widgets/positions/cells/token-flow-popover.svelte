<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenInfo } from '$lib/utils';
  import { walletStore, getBaseToken } from '$lib/stores/wallet.svelte';
  import * as Popover from '$lib/components/ui/popover';
  import * as Avatar from '$lib/components/ui/avatar';
  import type { HistoricalPosition } from '../historical-positions.service';

  interface Props {
    position: HistoricalPosition;
    netTokenFlow: CurrencyAmount | null;
  }

  let { position, netTokenFlow }: Props = $props();

  // Calculate detailed inflow data
  const inflowData = $derived.by(() => {
    const baseToken = getBaseToken();
    const flows = [];
    let totalBaseValue = CurrencyAmount.fromScaled(0, baseToken);

    for (const [tokenAddress, amount] of Object.entries(
      position.token_inflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const inflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const baseEquivalent = walletStore.convertTokenAmount(
          inflowAmount,
          tokenInfo,
          baseToken,
        );

        if (baseEquivalent) {
          totalBaseValue = totalBaseValue.add(baseEquivalent);
        }

        flows.push({
          token: tokenInfo,
          amount: inflowAmount,
          baseEquivalent,
          isPositive: true,
        });
      }
    }

    return { flows, totalBaseValue };
  });

  // Calculate detailed outflow data
  const outflowData = $derived.by(() => {
    const baseToken = getBaseToken();
    const flows = [];
    let totalBaseValue = CurrencyAmount.fromScaled(0, baseToken);

    for (const [tokenAddress, amount] of Object.entries(
      position.token_outflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const outflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const baseEquivalent = walletStore.convertTokenAmount(
          outflowAmount,
          tokenInfo,
          baseToken,
        );

        if (baseEquivalent) {
          totalBaseValue = totalBaseValue.add(baseEquivalent);
        }

        flows.push({
          token: tokenInfo,
          amount: outflowAmount,
          baseEquivalent,
          isPositive: false,
        });
      }
    }

    return { flows, totalBaseValue };
  });

  const hasFlows = $derived(
    inflowData.flows.length > 0 || outflowData.flows.length > 0,
  );
</script>

<Popover.Root>
  <Popover.Trigger>
    <button class="text-right hover:bg-white/10 rounded p-1 transition-colors">
      {#if netTokenFlow && !netTokenFlow.isZero()}
        <span
          class={netTokenFlow.rawValue().isPositive()
            ? 'text-green-400'
            : 'text-red-400'}
        >
          {netTokenFlow.rawValue().isPositive() ? '+' : ''}{netTokenFlow
            .rawValue()
            .toNumber()
            .toFixed(2)} $
        </span>
        {#if hasFlows}
          <svg
            class="inline w-3 h-3 ml-1 opacity-60"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path
              d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"
            />
          </svg>
        {/if}
      {:else}
        <span class="text-gray-500">-</span>
      {/if}
    </button>
  </Popover.Trigger>

  {#if hasFlows}
    <Popover.Content class="w-96 bg-gray-900 border border-gray-700 shadow-xl">
      <div class="space-y-4">
        <div
          class="text-sm font-medium text-gray-200 border-b border-gray-700 pb-2"
        >
          Token Flow Details
        </div>

        <!-- Net Summary -->
        {#if netTokenFlow && !netTokenFlow.isZero()}
          <div class="bg-gray-800 rounded p-3">
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Net Flow</span>
              <span
                class="font-semibold {netTokenFlow.rawValue().isPositive()
                  ? 'text-green-400'
                  : 'text-red-400'}"
              >
                {netTokenFlow.rawValue().isPositive() ? '+' : ''}${netTokenFlow
                  .rawValue()
                  .toNumber()
                  .toFixed(2)}
              </span>
            </div>
          </div>
        {/if}

        <!-- Inflows Section -->
        {#if inflowData.flows.length > 0}
          <div>
            <div class="flex justify-between items-center mb-2">
              <h4 class="text-sm font-medium text-green-400">Token Inflows</h4>
              <span class="text-xs text-green-400">
                +${inflowData.totalBaseValue.rawValue().toNumber().toFixed(2)}
              </span>
            </div>
            <div class="space-y-2 max-h-32 overflow-y-auto">
              {#each inflowData.flows as flow}
                <div
                  class="flex items-center justify-between bg-green-900/20 rounded p-2"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <Avatar.Root class="h-6 w-6 flex-shrink-0">
                      <Avatar.Fallback
                        class="text-[9px] bg-gray-700 text-gray-300"
                      >
                        {flow.token.symbol.slice(0, 2)}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm text-gray-200 truncate">
                        {flow.token.symbol}
                      </span>
                      <span class="text-xs text-green-400">
                        +{flow.amount.toString()}
                      </span>
                    </div>
                  </div>
                  {#if flow.baseEquivalent && !flow.baseEquivalent.isZero()}
                    <span class="text-xs text-green-400 ml-2 flex-shrink-0">
                      +${flow.baseEquivalent.rawValue().toNumber().toFixed(2)}
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Outflows Section -->
        {#if outflowData.flows.length > 0}
          <div>
            <div class="flex justify-between items-center mb-2">
              <h4 class="text-sm font-medium text-red-400">Token Outflows</h4>
              <span class="text-xs text-red-400">
                -${outflowData.totalBaseValue.rawValue().toNumber().toFixed(2)}
              </span>
            </div>
            <div class="space-y-2 max-h-32 overflow-y-auto">
              {#each outflowData.flows as flow}
                <div
                  class="flex items-center justify-between bg-red-900/20 rounded p-2"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <Avatar.Root class="h-6 w-6 flex-shrink-0">
                      <Avatar.Fallback
                        class="text-[9px] bg-gray-700 text-gray-300"
                      >
                        {flow.token.symbol.slice(0, 2)}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm text-gray-200 truncate">
                        {flow.token.symbol}
                      </span>
                      <span class="text-xs text-red-400">
                        -{flow.amount.toString()}
                      </span>
                    </div>
                  </div>
                  {#if flow.baseEquivalent && !flow.baseEquivalent.isZero()}
                    <span class="text-xs text-red-400 ml-2 flex-shrink-0">
                      -${flow.baseEquivalent.rawValue().toNumber().toFixed(2)}
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </Popover.Content>
  {/if}
</Popover.Root>
