<script lang="ts">
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import PonziSlider from '$lib/components/ui/ponzi-slider/ponzi-slider.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { Token, LandYieldInfo } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { toHexWithPadding } from '$lib/utils';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import data from '$profileData';
  import BuyInsightsNeighborGrid from './buy-insights-neighbor-grid.svelte';

  let {
    sellAmountVal = undefined,
    stakeAmountVal = undefined,
    selectedToken,
    land,
  }: {
    sellAmountVal?: string;
    stakeAmountVal?: string;
    selectedToken: Token | undefined;
    land: LandWithActions;
  } = $props();

  const BASE_TOKEN = data.mainCurrencyAddress;
  let baseToken = $derived(
    data.availableTokens.find((token) => token.address === BASE_TOKEN),
  );

  let neighbors = $derived(land?.getNeighbors());
  let nbNeighbors = $derived(neighbors?.getNeighbors().length ?? 0);

  let yieldInfo = $state<LandYieldInfo | undefined>(undefined);
  let currentYieldInBaseToken = $state<CurrencyAmount | undefined>(undefined);
  let yieldPerNeighbor = $state<CurrencyAmount | undefined>(undefined);
  let sliderNeighborsYieldInBaseToken = $derived.by(() => {
    if (!yieldPerNeighbor || !baseToken) return undefined;
    return CurrencyAmount.fromScaled(
      yieldPerNeighbor.rawValue().times(nbNeighbors).toString(),
      baseToken,
    );
  });

  $effect(() => {
    if (land) {
      land.getYieldInfo().then(async (info) => {
        yieldInfo = info;
        await calculateYieldInBaseToken();
      });
    }
  });

  /**
   * Calculates the total yield from all tokens in base token equivalent.
   *
   * This function processes the land's yield information, which may contain
   * yields in multiple different tokens, and converts them all to the base
   * token equivalent using current market prices from the wallet store.
   *
   * It also calculates the yield per neighbor for display purposes.
   *
   * @returns Promise<void> - Updates totalYieldInBaseToken and yieldPerNeighbor state
   */
  async function calculateYieldInBaseToken() {
    if (!yieldInfo?.yield_info || !baseToken) return;
    let totalValue = CurrencyAmount.fromUnscaled('0', baseToken);

    // Process each token's yield and convert to base token
    for (const [, yieldData] of Object.entries(yieldInfo.yield_info)) {
      const tokenHexAddress = toHexWithPadding(yieldData.token);
      const tokenData = data.availableTokens.find(
        (token) => token.address === tokenHexAddress,
      );

      if (!tokenData) continue;

      // Create currency amount for this token's hourly yield
      const amount = CurrencyAmount.fromUnscaled(yieldData.per_hour, tokenData);

      // Convert to base token using wallet store's price conversion
      const convertedAmount = walletStore.convertTokenAmount(
        amount,
        tokenData,
        baseToken,
      );

      if (convertedAmount) {
        totalValue = totalValue.add(convertedAmount);
      }
    }

    currentYieldInBaseToken = totalValue;

    // Calculate yield per neighbor for UI display
    if (nbNeighbors > 0) {
      yieldPerNeighbor = CurrencyAmount.fromScaled(
        totalValue.rawValue().dividedBy(nbNeighbors).toString(),
        baseToken,
      );
    } else {
      yieldPerNeighbor = CurrencyAmount.fromUnscaled('0', baseToken);
    }
  }
</script>

<div class="w-full flex flex-col gap-2">
  <h2 class="font-ponzi-number">Neighborhood Tax Impact</h2>
  <p class="leading-none -mt-1 opacity-75">
    You can get an estimation of your land survival time in function of its
    neighbors
  </p>

  <div class="flex gap-2">
    <div>
      {#if neighbors}
        <BuyInsightsNeighborGrid {neighbors} {nbNeighbors} {selectedToken} />
      {/if}
    </div>
    <PonziSlider bind:value={nbNeighbors} />

    <div class="flex flex-col flex-1 ml-4 justify-center tracking-wide">
      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div>
          <span class="opacity-50">For</span>
          <span class="text-xl text-blue-300 leading-none">{nbNeighbors}</span>
          <span class="opacity-50"> neighbors </span>
        </div>
      </div>

      <hr class="my-1 opacity-50" />

      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div>
          <span class="opacity-50">Estimated yield</span>
        </div>
        <div class="text-green-500 flex items-center gap-1">
          <span>{sliderNeighborsYieldInBaseToken ?? '-'}</span>
          <TokenAvatar token={baseToken} class="border border-white w-3 h-3" />
        </div>
      </div>

      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div>
          <span class="opacity-50">Nuke time</span>
        </div>
        <div class=" {true ? 'text-red-500' : 'text-green-500'}">ok</div>
      </div>

      <hr class="my-1 opacity-50" />

      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div class="opacity-50">Estd. earn / neighbor</div>
        <div class="text-green-500 flex items-center gap-1">
          <span>{yieldPerNeighbor ?? '-'}</span>
          <TokenAvatar token={baseToken} class="border border-white w-3 h-3" />
        </div>
      </div>

      <div
        class="flex justify-between font-ponzi-number select-text text-xs items-end"
      >
        <div class="opacity-50">Cost / neighbor / h</div>
        <div class="text-red-500">ok</div>
      </div>
    </div>
  </div>
</div>
