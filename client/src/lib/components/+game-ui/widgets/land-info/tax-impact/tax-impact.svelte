<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import PonziSlider from '$lib/components/ui/ponzi-slider/ponzi-slider.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { LandYieldInfo, Token } from '$lib/interfaces';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { calculateTaxes } from '$lib/utils/taxes';
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
  let nbNeighbors = $derived(neighbors?.getBaseLandsArray().length ?? 0);

  const maxNumberOfNeighbors = 8;

  $effect(() => {
    nbNeighbors = neighbors.getBaseLandsArray().length;
  });

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

  // estimate the taxes per neighbor using the formula based on the sell price of this land
  let taxPerNeighbor = $derived.by(() => {
    const tax = calculateTaxes(Number(sellAmountVal));
    console.log('Calculated tax:', tax);
    return CurrencyAmount.fromScaled(tax, selectedToken);
  });

  let sliderNeighborsCost = $derived.by(() => {
    if (!taxPerNeighbor) return undefined;
    return CurrencyAmount.fromScaled(
      taxPerNeighbor.rawValue().times(nbNeighbors).toString(),
      selectedToken,
    );
  });

  let sliderNeighborsCostInBaseToken = $derived.by(() => {
    if (!sliderNeighborsCost || !baseToken || !selectedToken) return undefined;
    return walletStore.convertTokenAmount(
      sliderNeighborsCost,
      selectedToken,
      baseToken,
    );
  });

  let sliderNetYieldInBaseToken = $derived.by(() => {
    if (
      !sliderNeighborsYieldInBaseToken ||
      !sliderNeighborsCostInBaseToken ||
      !baseToken
    ) {
      return sliderNeighborsYieldInBaseToken;
    }

    const yieldValue = sliderNeighborsYieldInBaseToken.rawValue();
    const costValue = sliderNeighborsCostInBaseToken.rawValue();
    const netValue = yieldValue.minus(costValue);

    return CurrencyAmount.fromScaled(netValue.toString(), baseToken);
  });

  /**
   * Calculates the estimated nuke time based on the selected number of neighbors.
   * Uses the current stake amount and hourly cost for the selected neighbors.
   */
  let sliderNukeTimeSeconds = $derived.by(() => {
    if (!land?.stakeAmount || !sliderNeighborsCost || nbNeighbors === 0) {
      return 0;
    }

    // Get current stake amount in same token as the cost
    const stakeValue = stakeAmountVal
      ? Number(stakeAmountVal)
      : Number(land.stakeAmount.rawValue());

    // Calculate hourly cost for selected neighbors
    const hourlyCost = sliderNeighborsCost.rawValue();

    if (hourlyCost.isZero()) return 0;

    // Calculate remaining hours: stakeAmount / hourlyCost
    const remainingHours = stakeValue / Number(hourlyCost);

    // Convert to seconds
    return remainingHours * 3600;
  });

  /**
   * Formats the nuke time in a human-readable format (days, hours, minutes, seconds).
   */
  let sliderNukeTimeString = $derived.by(() => {
    const timeSeconds = sliderNukeTimeSeconds;

    if (timeSeconds <= 0) {
      return 'Now!!!';
    }

    const days = Math.floor(timeSeconds / (3600 * 24));
    const hours = Math.floor((timeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((timeSeconds % 3600) / 60);
    const seconds = Math.floor(timeSeconds % 60);

    const parts = [
      days ? `${days}d` : '',
      hours ? `${hours}h` : '',
      minutes ? `${minutes}m` : '',
      seconds ? `${seconds}s` : '',
    ];

    const final = parts.filter(Boolean).join(' ');
    return final || 'Now!!!';
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
        class="flex justify-between select-text font-ponzi-number items-end text-xs"
      >
        <div>
          <span class="opacity-50">Yield /h for</span>
          <span class="text-xl text-blue-300 leading-none">{nbNeighbors}</span>
          <span class="opacity-50"> neighbors </span>
        </div>
        <div
          class="{sliderNetYieldInBaseToken &&
          sliderNetYieldInBaseToken.rawValue().isNegative()
            ? 'text-red-500'
            : 'text-green-500'} flex items-center gap-1"
        >
          <span>
            {#if sliderNetYieldInBaseToken}
              {sliderNetYieldInBaseToken.rawValue().isNegative() ? '' : '+'}
              {sliderNetYieldInBaseToken}
            {:else}
              -
            {/if}
            {baseToken?.symbol}
          </span>
          <TokenAvatar token={baseToken} class="border border-white w-3 h-3" />
        </div>
      </div>

      <hr class="my-1 opacity-50" />

      <div class="flex justify-between select-text leading-none items-end">
        <div>
          <span class="opacity-50">Gain /h</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="opacity-50"
            >{sliderNeighborsYieldInBaseToken} {baseToken?.symbol}</span
          >
          <TokenAvatar token={baseToken} class="border border-white w-3 h-3" />
        </div>
      </div>

      <!-- <div
        class="flex justify-between select-text leading-none items-end"
      >
        <div class="opacity-50">Cost / h</div>
        <div class="text-red-500 flex items-center gap-1">
          <span>
            {sliderNeighborsCost} {selectedToken?.symbol}
          </span>
          <TokenAvatar
            token={selectedToken}
            class="border border-white w-3 h-3"
          />
        </div>
      </div> -->
      <div class="flex justify-between select-text leading-none items-end">
        <div class="opacity-50">Cost /h</div>
        <div class="flex items-center gap-1">
          <span class="opacity-50">
            ({sliderNeighborsCostInBaseToken}
            {baseToken?.symbol})
          </span>
          <TokenAvatar token={baseToken} class="border border-white w-3 h-3" />
        </div>
      </div>

      <div class="flex justify-between select-text leading-none items-end">
        <div>
          <span class="opacity-50">Nuke time</span>
        </div>
        <div
          class={sliderNukeTimeString.includes('Now') ||
          sliderNukeTimeSeconds < 3600
            ? 'text-red-500'
            : 'text-green-500'}
        >
          {sliderNukeTimeString}
        </div>
      </div>

      <hr class="my-1 opacity-50" />

      <div class="flex justify-between select-text leading-none items-end">
        <div class="opacity-50">Estd. earn / neighbor / h</div>
        <div class="opacity-50 flex items-center gap-1">
          <span>{yieldPerNeighbor ?? '-'}</span>
          <TokenAvatar token={baseToken} class="border border-white w-3 h-3" />
        </div>
      </div>

      <div class="flex justify-between select-text leading-none items-end">
        <div class="opacity-50">Cost / neighbor / h</div>
        <div class="opacity-50 flex items-center gap-1">
          <span>
            ({taxPerNeighbor})
          </span>
          <TokenAvatar
            token={selectedToken}
            class="border border-white w-3 h-3"
          />
        </div>
      </div>
    </div>
  </div>
</div>
