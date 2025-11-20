<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import PonziSlider from '$lib/components/ui/ponzi-slider/ponzi-slider.svelte';
  import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { LandYieldInfo, Token } from '$lib/interfaces';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { calculateTaxes } from '$lib/utils/taxes';
  import data from '$profileData';
  import BuyInsightsNeighborGrid from './buy-insights-neighbor-grid.svelte';
  import NukeTimeBreakdown from './nuke-time-breakdown.svelte';
  import PaybackTimeBreakdown from './payback-time-breakdown.svelte';
  import SellProfitBreakdown from './sell-profit-breakdown.svelte';
  import { Card } from '$lib/components/ui/card';

  // Fee calculation constants (matching smart contract values)
  const SCALE_FACTOR_FOR_FEE = 10_000_000;
  const BUY_FEE_RATE = 500_000; // 5% fee (500,000 / 10,000,000)

  let {
    sellAmountVal = undefined,
    stakeAmountVal = undefined,
    selectedToken,
    land,
    auctionPrice = undefined,
    hasAdvisorWarnings = $bindable(false),
  }: {
    sellAmountVal?: string;
    stakeAmountVal?: string;
    selectedToken: Token | undefined;
    land: LandWithActions;
    auctionPrice?: CurrencyAmount;
    hasAdvisorWarnings?: boolean;
  } = $props();

  let baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return data.availableTokens.find(
      (token) => token.address === targetAddress,
    );
  });

  // Get the current buy price - either auction price or regular sell price
  let currentBuyPrice = $derived.by(() => {
    return land.type === 'auction' && auctionPrice
      ? auctionPrice
      : land.sellPrice;
  });

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

    if (!selectedToken) {
      return baseToken
        ? CurrencyAmount.fromScaled(0, baseToken)
        : CurrencyAmount.fromScaled(0);
    }
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

  /**
   * Calculates the seller fee amount (5%) from the sell price in selected token
   */
  let sellerFeeAmount = $derived.by(() => {
    if (!sellAmountVal || !selectedToken) {
      return undefined;
    }

    const sellValue = CurrencyAmount.fromScaled(sellAmountVal, selectedToken);

    // Calculate 5% fee in the selected token
    const feeAmount = sellValue
      .rawValue()
      .multipliedBy(BUY_FEE_RATE)
      .dividedBy(SCALE_FACTOR_FOR_FEE);

    return CurrencyAmount.fromScaled(feeAmount.toString(), selectedToken);
  });

  /**
   * Calculates the seller fee amount (5%) from the sell price in base token for other calculations
   */
  let sellerFeeAmountInBaseToken = $derived.by(() => {
    if (!sellerFeeAmount || !baseToken) {
      return undefined;
    }

    return walletStore.convertTokenAmount(
      sellerFeeAmount,
      selectedToken!,
      baseToken,
    );
  });

  /**
   * Calculates what the seller actually receives after the 5% fee is deducted (in selected token)
   */
  let netSellerProceedsInSelectedToken = $derived.by(() => {
    if (!sellAmountVal || !selectedToken || !sellerFeeAmount) {
      return undefined;
    }

    const sellValue = CurrencyAmount.fromScaled(sellAmountVal, selectedToken);

    // Net proceeds in selected token = sell price - fee (both in selected token)
    const netAmountInSelectedToken = sellValue
      .rawValue()
      .minus(sellerFeeAmount.rawValue());
    return CurrencyAmount.fromScaled(
      netAmountInSelectedToken.toString(),
      selectedToken,
    );
  });

  /**
   * Calculates what the seller actually receives after the 5% fee is deducted (converted to base token for calculations)
   */
  let netSellerProceedsInBaseToken = $derived.by(() => {
    if (!netSellerProceedsInSelectedToken || !baseToken) {
      return undefined;
    }

    // Convert net proceeds to base token for calculations
    return walletStore.convertTokenAmount(
      netSellerProceedsInSelectedToken,
      selectedToken!,
      baseToken,
    );
  });

  /**
   * Calculates the original cost in base token for display
   */
  let originalCostInBaseToken = $derived.by(() => {
    if (!currentBuyPrice || !land?.token || !baseToken) {
      return undefined;
    }

    return walletStore.convertTokenAmount(
      currentBuyPrice,
      land.token,
      baseToken,
    );
  });

  /**
   * Gets the original cost in the land's original token
   */
  let originalCostInLandToken = $derived.by(() => {
    if (!currentBuyPrice || !land?.token) {
      return undefined;
    }

    return currentBuyPrice;
  });

  /**
   * Calculates the actual profit/loss after accounting for seller fees.
   * Shows the true benefit: net_proceeds - original_buy_price (both converted to base token)
   */
  let actualSellBenefit = $derived.by(() => {
    if (!netSellerProceedsInBaseToken || !originalCostInBaseToken) {
      return undefined;
    }

    // Calculate actual profit: net_proceeds (in base token) - buy_price (in base token)
    const actualProfit = netSellerProceedsInBaseToken
      .rawValue()
      .minus(originalCostInBaseToken.rawValue());
    return CurrencyAmount.fromScaled(actualProfit.toString(), baseToken);
  });

  /**
   * @deprecated - kept for backwards compatibility, use actualSellBenefit instead
   * Calculates the potential sell benefit in base token.
   * Shows the difference between what we could sell the land for (sellAmountVal)
   * versus what we're buying it for (land.sellPrice).
   */
  let potentialSellBenefitInBaseToken = $derived.by(() => {
    return actualSellBenefit;
  });

  /**
   * Calculates how long it takes for the yield to recover the land purchase cost.
   * Returns the payback time in seconds based on net yield per hour.
   */
  let paybackTimeSeconds = $derived.by(() => {
    if (
      !currentBuyPrice ||
      !land?.token ||
      !baseToken ||
      !sliderNetYieldInBaseToken ||
      nbNeighbors === 0
    ) {
      return 0;
    }

    // Get the land purchase price in base token
    const buyPriceInBaseToken = walletStore.convertTokenAmount(
      currentBuyPrice,
      land.token,
      baseToken,
    );

    if (!buyPriceInBaseToken) return 0;

    const netYieldPerHour = sliderNetYieldInBaseToken.rawValue();

    // If net yield is negative or zero, payback is impossible
    if (netYieldPerHour.isLessThanOrEqualTo(0)) {
      return Infinity;
    }

    const landCost = buyPriceInBaseToken.rawValue();

    // Calculate hours needed: landCost / netYieldPerHour
    const hoursNeeded = landCost.dividedBy(netYieldPerHour);

    // Convert to seconds
    return hoursNeeded.multipliedBy(3600).toNumber();
  });

  /**
   * Formats the payback time in a human-readable format.
   */
  let paybackTimeString = $derived.by(() => {
    const timeSeconds = paybackTimeSeconds;

    if (timeSeconds === 0) {
      return 'No yield';
    }

    if (timeSeconds === Infinity) {
      return 'never';
    }

    const days = Math.floor(timeSeconds / (3600 * 24));
    const hours = Math.floor((timeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((timeSeconds % 3600) / 60);

    const parts = [
      days ? `${days}d` : '',
      hours ? `${hours}h` : '',
      minutes ? `${minutes}m` : '',
    ];

    const final = parts.filter(Boolean).join(' ');
    return final || '< 1m';
  });

  // Check if we have conversion rate issues
  let hasConversionError = $derived.by(() => {
    // Check if we can't convert the neighbor cost to base token
    if (
      sliderNeighborsCost &&
      baseToken &&
      selectedToken &&
      !sliderNeighborsCostInBaseToken
    ) {
      return true;
    }

    // Check if we can't convert the land's buy price to base token
    if (currentBuyPrice && land?.token && baseToken) {
      const buyPriceInBaseToken = walletStore.convertTokenAmount(
        currentBuyPrice,
        land.token,
        baseToken,
      );
      if (!buyPriceInBaseToken) {
        return true;
      }
    }

    return false;
  });

  $effect(() => {
    if (land) {
      land.getYieldInfo().then(async (info) => {
        yieldInfo = info;
        await calculateYieldInBaseToken();
      });
    }
  });

  // Recalculate yields when base token changes
  $effect(() => {
    if (yieldInfo && baseToken) {
      calculateYieldInBaseToken();
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
    let calculatedTotalValue = CurrencyAmount.fromUnscaled(0, baseToken);

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
        calculatedTotalValue = calculatedTotalValue.add(convertedAmount);
      }
    }

    // Update state only once after all calculations are complete
    totalValue = calculatedTotalValue;

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

  // Advisor warnings
  type AdvisorWarning = {
    type: 'weak' | 'strong';
    message: string;
  };

  let advisorWarnings = $derived.by((): AdvisorWarning[] => {
    const warnings: AdvisorWarning[] = [];

    // Warning 1: Payback time > nuke time by more than 10%
    if (
      paybackTimeSeconds !== Infinity &&
      sliderNukeTimeSeconds > 0 &&
      paybackTimeSeconds > sliderNukeTimeSeconds * 1.1
    ) {
      warnings.push({
        type: 'weak',
        message:
          'Your land will be nuked before you get back the price you bought it for. You can increase stake, or add more stake frequently to avoid losing your land',
      });
    }

    // Warning 2: Sell profit is less than buy price
    if (actualSellBenefit && actualSellBenefit.rawValue().isNegative()) {
      const profitInBaseToken = actualSellBenefit.rawValue();
      const buyPriceInBaseToken = originalCostInBaseToken?.rawValue();

      if (buyPriceInBaseToken && !buyPriceInBaseToken.isZero()) {
        const profitPercent = profitInBaseToken
          .dividedBy(buyPriceInBaseToken)
          .multipliedBy(100)
          .toNumber();

        if (profitPercent <= -20) {
          warnings.push({
            type: 'strong',
            message: `If your land is bought by another player, you will get ${netSellerProceedsInSelectedToken?.toString() || '0'} ${selectedToken?.symbol}, which is ${actualSellBenefit.rawValue().abs().decimalPlaces(2).toString()} ${baseToken?.symbol} less than what you will be spending to buy the land.`,
          });
        } else if (profitPercent <= -10) {
          warnings.push({
            type: 'weak',
            message: `If your land is bought by another player, you will get ${netSellerProceedsInSelectedToken?.toString() || '0'} ${selectedToken?.symbol}, which is ${actualSellBenefit.rawValue().abs().decimalPlaces(2).toString()} ${baseToken?.symbol} less than what you will be spending to buy the land.`,
          });
        }
      }
    }

    // Warning 3: Taxes > yield
    if (
      sliderNetYieldInBaseToken &&
      sliderNetYieldInBaseToken.rawValue().isNegative()
    ) {
      warnings.push({
        type: 'weak',
        message:
          'You are spending more in taxes than what you are getting from your neighbors. Decrease the sell price to turn a profit.',
      });
    }

    return warnings;
  });

  // Update the bindable prop whenever advisorWarnings changes
  $effect(() => {
    hasAdvisorWarnings = advisorWarnings.length > 0;
  });
</script>

<div class="w-full flex flex-col gap-2">
  <h2 class="font-ponzi-number">Neighborhood Tax Impact</h2>
  <p class="leading-none -mt-1 opacity-75">
    You can get an estimation of your land survival time in function of its
    neighbors
  </p>

  {#if hasConversionError}
    <div
      class="bg-yellow-900/20 border border-yellow-600/30 rounded p-2 text-yellow-300 text-xs"
    >
      ⚠️ Cannot convert token prices - calculations may be inaccurate
    </div>
  {/if}

  <!-- Horizontal Slider Above -->
  <div class="mb-4 w-full">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="opacity-50 text-sm">Neighbors:</span>

        <PonziSlider bind:value={nbNeighbors} />
      </div>

      <div
        class="{sliderNetYieldInBaseToken &&
        sliderNetYieldInBaseToken.rawValue().isNegative()
          ? 'text-red-500'
          : 'text-green-500'} font-ponzi-number flex items-center gap-1 text-xl"
      >
        <span>
          {#if sliderNetYieldInBaseToken}
            {sliderNetYieldInBaseToken.rawValue().isNegative() ? '' : '+'}
            {sliderNetYieldInBaseToken}
          {:else}
            -
          {/if}
          {baseToken?.symbol}/h
        </span>
        <TokenAvatar token={baseToken} class="border border-white w-3 h-3" />
      </div>
    </div>
  </div>

  <!-- Grid and Details Below -->
  <div class="flex gap-4">
    <div class="flex-shrink-0">
      {#if neighbors}
        <BuyInsightsNeighborGrid {neighbors} {nbNeighbors} {selectedToken} />
      {/if}
    </div>

    <ScrollArea class="flex flex-col flex-1 gap-2 max-h-48 pr-2">
      <PaybackTimeBreakdown
        {paybackTimeString}
        {paybackTimeSeconds}
        {currentBuyPrice}
        landToken={land.token}
        {baseToken}
        {nbNeighbors}
        netYieldPerHour={sliderNetYieldInBaseToken || undefined}
        currentBuyPriceInBaseToken={originalCostInBaseToken || undefined}
        grossYieldPerHour={sliderNeighborsYieldInBaseToken || undefined}
        hourlyCostInBaseToken={sliderNeighborsCostInBaseToken || undefined}
      />

      <NukeTimeBreakdown
        nukeTimeString={sliderNukeTimeString}
        nukeTimeSeconds={sliderNukeTimeSeconds}
        stakeAmount={stakeAmountVal
          ? CurrencyAmount.fromScaled(stakeAmountVal, selectedToken)
          : land?.stakeAmount}
        {selectedToken}
        {baseToken}
        {nbNeighbors}
        hourlyCost={sliderNeighborsCost}
        hourlyCostInBaseToken={sliderNeighborsCostInBaseToken || undefined}
        {taxPerNeighbor}
      />
      <hr class="my-1 opacity-50" />

      {#if sellAmountVal && selectedToken && baseToken}
        <SellProfitBreakdown
          {sellAmountVal}
          {selectedToken}
          {baseToken}
          landToken={land.token}
          {sellerFeeAmount}
          netSellerProceeds={netSellerProceedsInSelectedToken}
          originalCost={originalCostInLandToken}
          originalCostInBaseToken={originalCostInBaseToken || undefined}
          {actualSellBenefit}
        />
      {/if}
    </ScrollArea>
  </div>

  <!-- Advisor Warnings -->
  {#if advisorWarnings.length > 0}
    {#each advisorWarnings as warning}
      <Card
        class="ponzi-bg bg-blend-overlay m-0 mt-4 p-3 {warning.type === 'strong'
          ? 'bg-red-600/50'
          : 'bg-orange-300/50'}"
      >
        <div class="flex justify-stretch items-start">
          <img
            src="/ui/icons/Icon_Shield{warning.type === 'strong'
              ? 'Red'
              : 'Orange'}.png"
            alt="Shield {warning.type === 'strong' ? 'Red' : 'Orange'} Icon"
            class="w-8 h-8 mr-2 flex-shrink-0"
          />
          <span class="text-lg leading-tight">
            {warning.message}
          </span>
        </div>
      </Card>
    {/each}
  {/if}
</div>
