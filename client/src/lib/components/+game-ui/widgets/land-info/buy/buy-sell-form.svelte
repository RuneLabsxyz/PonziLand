<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { Input } from '$lib/components/ui/input';
  import Label from '$lib/components/ui/label/label.svelte';
  import { Select, SelectContent } from '$lib/components/ui/select';
  import SelectItem from '$lib/components/ui/select/select-item.svelte';
  import SelectTrigger from '$lib/components/ui/select/select-trigger.svelte';
  import { Card } from '$lib/components/ui/card';
  import type { Token } from '$lib/interfaces';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { getTokenMetadata } from '$lib/utils';
  import { calculateTaxes } from '$lib/utils/taxes';
  import data from '$profileData';

  let {
    selectedToken = $bindable<Token | undefined>(),
    stakeAmount = $bindable<CurrencyAmount>(),
    sellAmount = $bindable<CurrencyAmount>(),
    land,
  }: {
    selectedToken: Token | undefined;
    stakeAmount: CurrencyAmount;
    sellAmount: CurrencyAmount;
    land: LandWithActions;
  } = $props();

  let baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return (
      data.availableTokens.find((token) => token.address === targetAddress) ||
      data.availableTokens.find(
        (token) => token.address === data.mainCurrencyAddress,
      )!
    );
  });

  let stakeAmountVal = $state(stakeAmount.toString());
  let sellAmountVal = $state(sellAmount.toString());
  let error = $state<string | null>(null);

  const validateForm = async () => {
    error = null;

    if (!selectedToken) {
      error = 'Please select a token';
      return false;
    }

    let parsedStake = parseFloat(stakeAmountVal);
    let parsedSell = parseFloat(sellAmountVal);

    if (isNaN(parsedStake) || parsedStake <= 0) {
      error = 'Stake amount must be a number greater than 0';
      return false;
    }

    if (isNaN(parsedSell) || parsedSell <= 0) {
      error = 'Sell price must be a number greater than 0';
      return false;
    }

    // get selected token balance from tokenStore balance
    const selectedTokenBalance = walletStore.getBalance(selectedToken?.address);

    if (!selectedTokenBalance) {
      error = "You don't have any of this token";
      return false;
    }

    // Check if the land's current price is affordable
    if (land.type === 'auction') {
      // For auction lands, get the current auction price (use client calc for validation)
      const currentAuctionPrice = await land.getCurrentAuctionPrice(false);
      if (!currentAuctionPrice || !land.token) {
        error = 'Unable to get current auction price';
        return false;
      }
      if (
        selectedTokenBalance
          .rawValue()
          .isLessThan(currentAuctionPrice.rawValue())
      ) {
        error = `This land is too expensive. Current auction price: ${currentAuctionPrice.toString()} ${land.token.symbol}. Your balance: ${selectedTokenBalance.toString()} ${selectedToken.symbol}`;
        return false;
      }
    } else if (
      land.sellPrice &&
      land.token &&
      selectedTokenBalance.rawValue().isLessThan(land.sellPrice.rawValue())
    ) {
      error = `This land is too expensive. Current price: ${land.sellPrice.toString()} ${land.token.symbol}. Your balance: ${selectedTokenBalance.toString()} ${selectedToken.symbol}`;
      return false;
    }

    // Check if the total amount (stake + sell) is affordable
    let totalRequired;
    if (land.type === 'auction') {
      const currentAuctionPrice = await land.getCurrentAuctionPrice(false);
      if (!currentAuctionPrice || !land.token) {
        error = 'Unable to get current auction price';
        return false;
      }
      totalRequired = parsedStake + currentAuctionPrice.rawValue().toNumber();
    } else {
      totalRequired = parsedStake + parsedSell;
    }

    const stakeAmount = CurrencyAmount.fromScaled(parsedStake, selectedToken);
    if (!walletStore.isWithinCap(stakeAmount)) {
      let cap = walletStore.getCapForToken(selectedToken);
      return `Above the playtest cap! Max is ${cap.toString()} ${selectedToken.symbol}`;
    }

    if (selectedTokenBalance.rawValue().isLessThan(totalRequired)) {
      error = `Insufficient balance. You need ${totalRequired} ${selectedToken.symbol} (stake: ${parsedStake}, ${land.type === 'auction' ? 'current auction price' : 'price'}: ${land.type === 'auction' ? (await land.getCurrentAuctionPrice(false))?.toString() : parsedSell}). Your balance: ${selectedTokenBalance.toString()} ${selectedToken.symbol}`;
      return false;
    }

    return true;
  };

  $effect(() => {
    // Validate form whenever values change
    validateForm();
  });

  $effect(() => {
    if (selectedToken == undefined) {
      selectedToken = data.availableTokens.find(
        (t) => t.symbol == baseToken?.symbol,
      );
    }
  });

  $effect(() => {
    stakeAmount = CurrencyAmount.fromScaled(stakeAmountVal);
  });

  $effect(() => {
    stakeAmount = CurrencyAmount.fromScaled(stakeAmountVal);
    sellAmount = CurrencyAmount.fromScaled(sellAmountVal);
  });

  // Advisor calculations
  let neighbors = $derived(land?.getNeighbors());
  let nbNeighbors = $derived(neighbors?.getBaseLandsArray().length ?? 0);

  // Calculate taxes per neighbor based on sell price
  let taxPerNeighbor = $derived.by(() => {
    if (!sellAmountVal || isNaN(parseFloat(sellAmountVal))) return 0;
    return calculateTaxes(parseFloat(sellAmountVal));
  });

  // Calculate total hourly cost (taxes * neighbors)
  let totalHourlyCost = $derived(taxPerNeighbor * nbNeighbors);

  // Calculate nuke time in seconds
  let nukeTimeSeconds = $derived.by(() => {
    if (!stakeAmountVal || totalHourlyCost === 0) return 0;
    const parsedStake = parseFloat(stakeAmountVal);
    if (isNaN(parsedStake) || parsedStake <= 0) return 0;
    const remainingHours = parsedStake / totalHourlyCost;
    return remainingHours * 3600;
  });

  // Get current buy price (auction or regular)
  let currentBuyPrice = $state<CurrencyAmount | undefined>(undefined);
  $effect(() => {
    if (land.type === 'auction') {
      land.getCurrentAuctionPrice(false).then((price) => {
        currentBuyPrice = price || undefined;
      });
    } else {
      currentBuyPrice = land.sellPrice;
    }
  });

  // Calculate yield from neighbors
  let yieldPerHour = $state(0);
  $effect(() => {
    if (land) {
      land.getYieldInfo().then((info) => {
        if (!info?.yield_info) return;
        let total = 0;
        for (const yieldData of Object.values(info.yield_info)) {
          total += parseFloat(yieldData.per_hour.toString());
        }
        yieldPerHour = total;
      });
    }
  });

  // Calculate net yield (yield - taxes) in base currency
  let netYieldPerHour = $derived(yieldPerHour - totalHourlyCost);

  // Calculate payback time in seconds
  let paybackTimeSeconds = $derived.by(() => {
    if (!currentBuyPrice || netYieldPerHour <= 0) return Infinity;
    const buyPriceValue = parseFloat(currentBuyPrice.toString());
    if (isNaN(buyPriceValue) || buyPriceValue <= 0) return Infinity;
    const hoursNeeded = buyPriceValue / netYieldPerHour;
    return hoursNeeded * 3600;
  });

  // Calculate sell profit/loss
  let sellProfit = $derived.by(() => {
    if (!sellAmountVal || !currentBuyPrice) return 0;
    const sellValue = parseFloat(sellAmountVal);
    const buyValue = parseFloat(currentBuyPrice.toString());
    if (isNaN(sellValue) || isNaN(buyValue)) return 0;
    // Account for 5% seller fee
    const netSellValue = sellValue * 0.95;
    return netSellValue - buyValue;
  });

  let sellProfitPercent = $derived.by(() => {
    if (!currentBuyPrice) return 0;
    const buyValue = parseFloat(currentBuyPrice.toString());
    if (buyValue === 0) return 0;
    return (sellProfit / buyValue) * 100;
  });

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
      nukeTimeSeconds > 0 &&
      paybackTimeSeconds > nukeTimeSeconds * 1.1
    ) {
      warnings.push({
        type: 'weak',
        message:
          'Your land will be nuked before you get back the price you bought it for. You can increase stake, or add more stake frequently to avoid losing your land',
      });
    }

    // Warning 2: Sell profit is less than buy price
    if (sellProfit < 0 && currentBuyPrice) {
      const sellValue = parseFloat(sellAmountVal || '0');
      const netSellValue = sellValue * 0.95; // After 5% fee
      const lossAmount = Math.abs(sellProfit);

      if (sellProfitPercent <= -20) {
        warnings.push({
          type: 'strong',
          message: `If your land is bought by another player, you will get ${netSellValue.toFixed(2)} ${selectedToken?.symbol}, which is ${lossAmount.toFixed(2)} ${selectedToken?.symbol} less than what you will be spending to buy the land.`,
        });
      } else if (sellProfitPercent <= -10) {
        warnings.push({
          type: 'weak',
          message: `If your land is bought by another player, you will get ${netSellValue.toFixed(2)} ${selectedToken?.symbol}, which is ${lossAmount.toFixed(2)} ${selectedToken?.symbol} less than what you will be spending to buy the land.`,
        });
      }
    }

    // Warning 3: Taxes > yield
    if (netYieldPerHour < 0) {
      warnings.push({
        type: 'weak',
        message:
          'You are spending more in taxes than what you are getting from your neighbors. Decrease the sell price to turn a profit.',
      });
    }

    return warnings;
  });
</script>

<div class="w-full flex flex-col gap-2 text-stroke-none">
  <Label class="text-lg font-semibold">Select Token</Label>
  <Select onSelectedChange={(v) => (selectedToken = v?.value as Token)}>
    <SelectTrigger>
      {#if selectedToken}
        {@const metadata = getTokenMetadata(selectedToken.skin)}
        <div class="flex gap-2 items-center">
          <img
            class="h-4 w-4"
            src={metadata?.icon || '/tokens/default/icon.png'}
            alt={selectedToken.symbol}
          />
          {selectedToken.symbol} -
          {selectedToken.name}
        </div>
      {:else}
        Select Token
      {/if}
    </SelectTrigger>
    <SelectContent>
      {#each data.availableTokens as token}
        {@const metadata = getTokenMetadata(token.skin)}
        <SelectItem value={token}>
          <div class="flex gap-2 items-center">
            <img
              class="h-4 w-4"
              src={metadata?.icon || '/tokens/default/icon.png'}
              alt={token.symbol}
            />
            {token.symbol} -
            {token.name}
          </div>
        </SelectItem>
      {/each}
    </SelectContent>
  </Select>
  <div class="flex gap-2">
    <div>
      <Label class="text-lg font-semibold">Stake Amount</Label>
      <Input
        type="number"
        bind:value={stakeAmountVal}
        class={error ? 'border-red-500 border-2' : ''}
      />
    </div>
    <div>
      <Label class="text-lg font-semibold">Sell Price</Label>
      <Input
        type="number"
        bind:value={sellAmountVal}
        class={error ? 'border-red-500 border-2' : ''}
      />
    </div>
  </div>

  {#if error}
    <div class="text-red-500 mt-2 p-2 bg-red-50 border border-red-200 rounded">
      {error}
    </div>
  {/if}

  <!-- Advisor Warnings -->
  {#if advisorWarnings.length > 0}
    {#each advisorWarnings as warning}
      {#if warning.type === 'strong'}
        <Card class="bg-red-600/50 ponzi-bg bg-blend-overlay m-0 mt-4">
          <div class="flex justify-stretch">
            <img
              src="/ui/icons/Icon_ShieldRed.png"
              alt="Shield Red Icon"
              class="w-8 h-8 mr-2"
            />
            <span class="text-lg">
              {warning.message}
            </span>
          </div>
        </Card>
      {:else}
        <Card class="bg-orange-300/50 ponzi-bg bg-blend-overlay m-0 mt-4">
          <div class="flex justify-stretch">
            <img
              src="/ui/icons/Icon_ShieldOrange.png"
              alt="Shield Orange Icon"
              class="w-8 h-8 mr-2"
            />
            <span class="text-lg">
              {warning.message}
            </span>
          </div>
        </Card>
      {/if}
    {/each}
  {/if}
</div>
