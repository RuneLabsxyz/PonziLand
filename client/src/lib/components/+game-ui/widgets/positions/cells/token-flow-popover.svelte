<script lang="ts">
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenInfo } from '$lib/utils';
  import { walletStore, getBaseToken } from '$lib/stores/wallet.svelte';
  import * as Popover from '$lib/components/ui/popover';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { HistoricalPosition } from '../historical-positions.service';
  import { Card } from '$lib/components/ui/card';

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

    // Sort flows by dollar equivalent (highest first)
    flows.sort((a, b) => {
      const valueA = a.baseEquivalent?.rawValue().toNumber() || 0;
      const valueB = b.baseEquivalent?.rawValue().toNumber() || 0;
      return valueB - valueA;
    });

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
    <Popover.Content class="bg-ponzi w-80">
      <div
        class=" font-ponzi-number text-xs stroke-3d-black text-gray-200 border-b border-gray-700 pb-2 mb-3"
      >
        Token Flow Details
      </div>

      <!-- Income Section -->
      {#if inflowData.flows.length > 0}
        <div class="mb-4">
          <div class="flex justify-between items-center mb-3">
            <h4
              class="font-ponzi-number text-xs stroke-3d-black text-green-400"
            >
              Income
            </h4>
            <span class="tracking-wider text-green-400 font-medium">
              +${inflowData.totalBaseValue.rawValue().toNumber().toFixed(2)}
            </span>
          </div>
          <div class="space-y-2 tracking-wider">
            {#each inflowData.flows as flow}
              <div
                class="flex items-center justify-between bg-green-900/20 rounded p-2"
              >
                <div class="flex items-center gap-2">
                  <TokenAvatar token={flow.token} class="h-6 w-6" />
                  <div class="flex flex-col leading-none">
                    <span class="text-gray-200">
                      {flow.token.symbol}
                    </span>
                    <span class=" text-green-400">
                      +{flow.amount.toString()}
                    </span>
                  </div>
                </div>
                {#if flow.baseEquivalent && !flow.baseEquivalent.isZero()}
                  <span class="text-green-400 font-medium">
                    +${flow.baseEquivalent.rawValue().toNumber().toFixed(2)}
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Outcome Section -->
      {#if outflowData.flows.length > 0}
        <div>
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-ponzi-number text-xs stroke-3d-black text-red-400">
              Outcome
            </h4>
            <span class=" text-red-400 font-medium">
              -${outflowData.totalBaseValue.rawValue().toNumber().toFixed(2)}
            </span>
          </div>
          <div class="space-y-2 tracking-wider">
            {#each outflowData.flows as flow}
              <div
                class="flex items-center justify-between bg-red-900/20 rounded p-2"
              >
                <div class="flex items-center gap-2 leading-none">
                  <TokenAvatar token={flow.token} class="h-6 w-6" />
                  <div class="flex flex-col">
                    <span class=" text-gray-200">
                      {flow.token.symbol}
                    </span>
                    <span class=" text-red-400">
                      -{flow.amount.toString()}
                    </span>
                  </div>
                </div>
                {#if flow.baseEquivalent && !flow.baseEquivalent.isZero()}
                  <span class=" text-red-400 font-medium">
                    -${flow.baseEquivalent.rawValue().toNumber().toFixed(2)}
                  </span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </Popover.Content>
  {/if}
</Popover.Root>
