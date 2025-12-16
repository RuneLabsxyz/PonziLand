<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandSetup, LandWithActions } from '$lib/api/land';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import {
    nextStep,
    tutorialAttribute,
    tutorialState,
  } from '$lib/components/tutorial/stores.svelte';
  import { Button } from '$lib/components/ui/button';
  import Label from '$lib/components/ui/label/label.svelte';
  import TokenSelect from '$lib/components/ui/token/token-select.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import type { TabType, Token } from '$lib/interfaces';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { bidLand, buyLand, landStore } from '$lib/stores/store.svelte';
  import { getBaseToken, walletStore } from '$lib/stores/wallet.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { swapStore } from '$lib/stores/swap.store.svelte';
  import { padAddress } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import type { CairoCustomEnum } from 'starknet';
  import { untrack } from 'svelte';
  import TaxImpact from '../tax-impact/tax-impact.svelte';
  import RatioInput from '$lib/components/ui/ratio-input/ratio-input.svelte';
  import { displayCurrency } from '$lib/utils/currency';

  let {
    land,
    auctionPrice,
    activeTab = $bindable(),
    isActive = false,
  }: {
    land: LandWithActions;
    activeTab: TabType;
    isActive?: boolean;
    auctionPrice?: CurrencyAmount;
  } = $props();

  let baseToken = $derived(getBaseToken());

  let isOwner = $derived(
    padAddress(account.address ?? '') == padAddress(land.owner),
  );

  let hasAdvisorWarnings = $state(false);

  let tokenValue: Token | string | undefined = $state(data.mainCurrencyAddress);
  let selectedToken: Token | undefined = $derived.by(() => {
    if (typeof tokenValue === 'string') {
      return data.availableTokens.find(
        (token: Token) => token.address === tokenValue,
      );
    }
    return tokenValue;
  });

  let stakeAmount: CurrencyAmount = $derived.by(() => {
    if (!selectedToken) return CurrencyAmount.fromScaled(0, baseToken);
    // Clean formatted currency value before parsing
    const cleanStakePrice = (stakePrice ?? '')
      .toString()
      .replace(/[,$\s]/g, '');
    const stakePriceNum = parseFloat(cleanStakePrice);
    if (isNaN(stakePriceNum) || stakePriceNum <= 0) {
      return CurrencyAmount.fromScaled(0, selectedToken);
    }
    return CurrencyAmount.fromScaled(stakePriceNum, selectedToken);
  });

  let stakeAmountInBaseCurrency: CurrencyAmount | null = $derived.by(() => {
    if (!selectedToken || !stakeAmount) return null;

    // If already in base currency, return null (no conversion needed)
    if (padAddress(selectedToken.address) === padAddress(baseToken.address)) {
      return null;
    }

    return walletStore.convertTokenAmount(
      stakeAmount,
      selectedToken,
      baseToken,
    );
  });

  // State variables for editable sell price and base equivalent
  let sellPrice: string = $state('');
  let sellPriceBase: string = $state('');
  let userHasInteracted: boolean = $state(false);

  // State variables for stake amount
  let stakePrice: string = $state('');
  let stakePriceBase: string = $state('');

  // Track the token address to detect changes more reliably
  let previousTokenAddress: string = $state('');
  // Track auction price to detect changes
  let previousAuctionPrice: string = $state('');

  // Set sell price to match current land's selling price when token changes
  $effect(() => {
    if (!selectedToken) return;

    // Check if token actually changed
    const currentTokenAddress = selectedToken.address;
    const currentAuctionPriceStr = auctionPrice?.toString() || '';

    // Check if either token or auction price changed
    const tokenChanged = currentTokenAddress !== previousTokenAddress;
    const auctionPriceChanged =
      land.type === 'auction' &&
      currentAuctionPriceStr !== previousAuctionPrice;

    if (!tokenChanged && !auctionPriceChanged && userHasInteracted) return;

    // Reset interaction flag when token changes or auction price updates
    if (tokenChanged || auctionPriceChanged) {
      if (tokenChanged) {
        userHasInteracted = false;
        previousTokenAddress = currentTokenAddress;
      }
      if (auctionPriceChanged) {
        previousAuctionPrice = currentAuctionPriceStr;
        // Only reset interaction if this is an auction and price changed
        if (land.type === 'auction') {
          userHasInteracted = false;
        }
      }
    }

    // Don't update if user has interacted with the current token (unless auction price changed)
    if (userHasInteracted && !auctionPriceChanged) return;

    try {
      // For auctions, use the current auction price; otherwise use land's sell price
      const priceToUse =
        land.type === 'auction' && auctionPrice ? auctionPrice : land.sellPrice;

      const landPriceInSelectedToken = walletStore.convertTokenAmount(
        priceToUse,
        land.token!,
        selectedToken,
      );

      if (landPriceInSelectedToken) {
        sellPrice = displayCurrency(landPriceInSelectedToken.rawValue());

        // Calculate the equivalent in base currency
        const convertedToBase = walletStore.convertTokenAmount(
          landPriceInSelectedToken,
          selectedToken,
          baseToken,
        );
        sellPriceBase = convertedToBase
          ? displayCurrency(convertedToBase.rawValue())
          : '';

        // Initialize stake amount to match the price
        stakePrice = sellPrice;
        stakePriceBase = sellPriceBase;
      }
    } catch (error) {
      console.error('Error initializing sell price from land price:', error);
      // Fallback to the appropriate price if conversion fails
      const fallbackPrice =
        land.type === 'auction' && auctionPrice ? auctionPrice : land.sellPrice;
      sellPrice = displayCurrency(fallbackPrice.rawValue());
      sellPriceBase = '';
      stakePrice = sellPrice;
      stakePriceBase = sellPriceBase;
    }
  });

  let sellPriceAmount: CurrencyAmount = $derived.by(() => {
    if (!selectedToken) return CurrencyAmount.fromScaled(0, baseToken);
    // Clean formatted currency value for calculations
    const cleanSellPrice = (sellPrice ?? '0').toString().replace(/[,$\s]/g, '');
    return CurrencyAmount.fromScaled(cleanSellPrice || 0, selectedToken);
  });

  // Calculate total cost in base currency for display
  let totalCostInBase = $derived.by(() => {
    if (!land.token || !selectedToken) return null;

    // Get land price in base currency
    const landPriceInBase =
      land.type == 'auction' && auctionPrice
        ? walletStore.convertTokenAmount(auctionPrice, land.token, baseToken)
        : walletStore.convertTokenAmount(land.sellPrice, land.token, baseToken);

    // Get stake amount in base currency
    let stakeInBase = stakeAmountInBaseCurrency;
    if (
      !stakeInBase &&
      padAddress(selectedToken.address) === padAddress(baseToken.address)
    ) {
      stakeInBase = stakeAmount;
    }

    // Calculate total based on different scenarios
    if (landPriceInBase && stakeInBase) {
      return landPriceInBase.add(stakeInBase);
    }

    if (
      padAddress(land.token.address) === padAddress(baseToken.address) &&
      stakeInBase
    ) {
      const landPrice =
        land.type == 'auction' && auctionPrice ? auctionPrice : land.sellPrice;
      return landPrice.add(stakeInBase);
    }

    return null;
  });

  let loading = $state(false);

  let accountManager = useAccount();
  const { accountManager: dojoAccountManager } = useDojo();

  // Error handling for inputs
  let tokenError = $derived.by(() => {
    if (!tokenValue || !selectedToken) {
      return 'Please select a token';
    }
    return null;
  });

  let stakePriceError = $derived.by(() => {
    if (!stakePrice || !stakePrice.toString().trim()) {
      return 'Stake amount is required';
    }

    // Clean formatted currency value before parsing
    const cleanStakePrice = stakePrice.toString().replace(/[,$\s]/g, '');
    let parsedStakePrice = parseFloat(cleanStakePrice);
    if (isNaN(parsedStakePrice) || parsedStakePrice <= 0) {
      return 'Stake amount must be a number greater than 0';
    }

    return null;
  });

  let stakeAmountError = $derived.by(() => {
    // Use stakePrice directly for reactivity instead of the untracked stake
    const cleanStakePrice = (stakePrice ?? '')
      .toString()
      .replace(/[,$\s]/g, '');

    if (!cleanStakePrice || !cleanStakePrice.trim()) {
      return 'Stake amount is required';
    }

    let parsedStake = parseFloat(cleanStakePrice);
    if (isNaN(parsedStake) || parsedStake <= 0) {
      return 'Stake amount must be a number greater than 0';
    }

    if (!selectedToken) {
      return 'Please select a token first';
    }

    // Get selected token balance from tokenStore balance
    const selectedTokenBalance = walletStore.getBalance(selectedToken.address);

    if (selectedTokenBalance == undefined) {
      return "You don't have any of this token";
    }

    if (selectedTokenBalance.rawValue().isLessThanOrEqualTo(parsedStake)) {
      return `You don't have enough ${selectedToken.symbol} to stake (max: ${selectedTokenBalance.toString()})`;
    }

    const selectedTokenAmount = CurrencyAmount.fromScaled(
      parsedStake,
      selectedToken,
    );
    if (!walletStore.isWithinCap(selectedTokenAmount)) {
      let cap = walletStore.getCapForToken(selectedToken);
      return `Above the playtest cap! Max is ${cap.toString()} ${selectedToken.symbol}`;
    }

    return null;
  });

  let sellPriceError = $derived.by(() => {
    if (!sellPrice || !sellPrice.toString().trim()) {
      return 'Sell price is required';
    }

    // Clean formatted currency value before parsing
    const cleanSellPrice = sellPrice.toString().replace(/[,$\s]/g, '');
    let parsedSellPrice = parseFloat(cleanSellPrice);
    if (isNaN(parsedSellPrice) || parsedSellPrice <= 0) {
      return 'Sell price must be a number greater than 0';
    }

    return null;
  });

  let balanceError = $derived.by(() => {
    // Use stakePrice directly for reactivity
    const cleanStakePrice = (stakePrice ?? '')
      .toString()
      .replace(/[,$\s]/g, '');
    const parsedStake = parseFloat(cleanStakePrice || '0');

    // Check land purchase requirements
    if (land.type == 'auction') {
      const landPrice = auctionPrice;
      if (!landPrice) {
        return 'Auction price is not available';
      }
      const landTokenAmount = walletStore.getBalance(land.token?.address!);
      if (landTokenAmount == undefined) {
        return `You don't have any ${land.token?.symbol}`;
      }
      if (landTokenAmount.rawValue().isLessThan(landPrice.rawValue())) {
        return `You don't have enough ${land.token?.symbol} to buy this land (max: ${landTokenAmount.toString()})`;
      }
      // If has enough for price then check if the selected token is land token and add the stake amount
      if (selectedToken?.address === land.token?.address) {
        // Convert stakeAmount to the same token as landPrice to avoid currency mismatch
        const stakeAmountInLandToken = CurrencyAmount.fromScaled(
          parsedStake,
          land.token!,
        );
        const totalCost = landPrice.add(stakeAmountInLandToken);
        if (landTokenAmount.rawValue().isLessThan(totalCost.rawValue())) {
          return `You don't have enough ${land.token?.symbol} for both purchase and stake (max: ${landTokenAmount.toString()})`;
        }
      }
    }

    // If not auction, Do the same checks but with land.token for baseToken and selectedToken
    if (land.type !== 'auction') {
      const landTokenAmount = walletStore.getBalance(land.token?.address!);
      if (!landTokenAmount) {
        return `You don't have any ${land.token?.symbol}`;
      }
      if (landTokenAmount.rawValue().isLessThan(land.sellPrice.rawValue())) {
        return `You don't have enough ${land.token?.symbol} to buy this land (max: ${landTokenAmount.toString()})`;
      }

      const selectedAddress = padAddress(selectedToken?.address ?? '');
      const landTokenAddress = padAddress(land.token?.address ?? '');

      // if selectedToken is land.token, check if has enough for both
      if (selectedAddress === landTokenAddress) {
        try {
          // Convert stakeAmount to the same token as land.sellPrice to avoid currency mismatch
          const stakeAmountInLandToken = CurrencyAmount.fromScaled(
            parsedStake,
            land.token!,
          );
          const totalCost = land.sellPrice.add(stakeAmountInLandToken);

          if (landTokenAmount.rawValue().isLessThan(totalCost.rawValue())) {
            return `You don't have enough ${land.token?.symbol} for both purchase and stake (max: ${landTokenAmount.toString()})`;
          }
        } catch (error) {
          return 'Error calculating total cost';
        }
      }
    }
    if (tutorialState.tutorialEnabled && hasAdvisorWarnings) {
      return 'Fix the warnings above to continue';
    }

    return null;
  });

  // Check if form is valid
  let isFormValid = $derived(
    !tokenError &&
      !stakePriceError &&
      !stakeAmountError &&
      !sellPriceError &&
      !balanceError,
  );

  // Check if land token and selected token are the same
  let isSameToken = $derived(
    land.token &&
      selectedToken &&
      padAddress(land.token.address) === padAddress(selectedToken.address),
  );

  // Helper for stake-specific insufficient balance
  let insufficientStakeInfo = $derived.by(() => {
    if (!stakeAmountError || !selectedToken) return null;

    if (stakeAmountError.includes("don't have enough")) {
      // Use stakePrice directly for better reactivity when input changes
      const cleanStakePrice = (stakePrice ?? '')
        .toString()
        .replace(/[,$\s]/g, '');
      const stakeNeeded = parseFloat(cleanStakePrice || '0');

      if (isNaN(stakeNeeded) || stakeNeeded <= 0) return null;

      const balance = walletStore.getBalance(selectedToken.address);
      const currentBalance = balance
        ? parseFloat(balance.rawValue().toString())
        : 0;

      if (stakeNeeded > currentBalance) {
        // Calculate the shortfall (difference between needed and current balance)
        const shortfall = stakeNeeded - currentBalance;
        const amountWithBuffer = shortfall * 1.01; // Add 1% buffer for fees
        // For small amounts, ensure we don't round to zero
        const requiredAmount =
          amountWithBuffer < 1
            ? parseFloat(amountWithBuffer.toFixed(6)) // Keep precision for small amounts
            : Math.ceil(amountWithBuffer);

        return {
          destinationToken: selectedToken,
          requiredAmount,
          stakeNeeded, // Keep track of the full amount needed for display
        };
      }
    }

    return null;
  });

  // Helper for purchase/combined insufficient balance
  let insufficientBalanceInfo = $derived.by(() => {
    if (!balanceError || !land.token) return null;

    // Check if it's an insufficient balance error
    if (balanceError.includes("You don't have enough")) {
      let neededToken: Token | undefined = land.token;
      let totalNeeded = 0;
      let currentBalance = 0;

      // Determine the land price
      const landPrice =
        land.type === 'auction' && auctionPrice
          ? parseFloat(auctionPrice.rawValue().toString())
          : parseFloat(land.sellPrice.rawValue().toString());

      const balance = walletStore.getBalance(land.token.address);
      currentBalance = balance ? parseFloat(balance.rawValue().toString()) : 0;

      // If same token, always include stake amount in the total
      if (isSameToken) {
        // Use stakePrice directly for better reactivity
        const cleanStakePrice = (stakePrice ?? '')
          .toString()
          .replace(/[,$\s]/g, '');
        const stakePriceNum = parseFloat(cleanStakePrice || '0');
        // Need total of land price + stake amount
        totalNeeded = landPrice + (isNaN(stakePriceNum) ? 0 : stakePriceNum);
      }
      // Otherwise just need land price
      else {
        totalNeeded = landPrice;
      }

      if (neededToken && totalNeeded > currentBalance) {
        // Calculate the shortfall (difference between needed and current balance)
        const shortfall = totalNeeded - currentBalance;
        const amountWithBuffer = shortfall * 1.01; // Add 1% buffer for fees
        // For small amounts, ensure we don't round to zero
        const requiredAmount =
          amountWithBuffer < 1
            ? parseFloat(amountWithBuffer.toFixed(6)) // Keep precision for small amounts
            : Math.ceil(amountWithBuffer);

        return {
          destinationToken: neededToken,
          requiredAmount,
          totalNeeded, // Keep track of the full amount needed for display
          isForBoth: isSameToken, // Track if this is for both land and stake
        };
      }
    }

    return null;
  });

  // Function to open swap widget for stake errors
  function openSwapForStake(event: MouseEvent) {
    event.stopPropagation();
    if (!insufficientStakeInfo) return;

    // Set the swap configuration in the store
    swapStore.setConfig({
      destinationToken: insufficientStakeInfo.destinationToken,
      destinationAmount: insufficientStakeInfo.requiredAmount,
      sourceToken: baseToken,
    });

    // Open the swap widget
    widgetsStore.updateWidget('swap', {
      isOpen: true,
      isMinimized: false,
    });

    // Bring the swap widget to front
    widgetsStore.bringToFront('swap');
  }

  // Function to open swap widget for balance errors
  function openSwapForBalance(event: MouseEvent) {
    event.stopPropagation();
    if (!insufficientBalanceInfo) return;

    // Set the swap configuration in the store
    swapStore.setConfig({
      destinationToken: insufficientBalanceInfo.destinationToken,
      destinationAmount: insufficientBalanceInfo.requiredAmount,
      sourceToken: baseToken,
    });

    // Open the swap widget
    widgetsStore.updateWidget('swap', {
      isOpen: true,
      isMinimized: false,
    });

    // Bring the swap widget to front
    widgetsStore.bringToFront('swap');
  }

  async function handleBuyClick() {
    loading = true;

    // Double-check validation before proceeding
    if (!isFormValid) {
      console.error('Form validation failed');
      loading = false;
      return;
    }

    let currentPrice: CurrencyAmount | undefined = land.sellPrice;

    if (land.type == 'auction') {
      // Use RPC for exact price when bidding to avoid approval issues
      currentPrice = await land.getCurrentAuctionPrice(true);
    }

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address || '',
      salePrice: sellPriceAmount,
      amountToStake: stakeAmount,
      tokenAddress: land.tokenAddress ?? '',
      currentPrice: currentPrice ?? null,
    };

    if (!land) {
      console.error('No land selected');
      loading = false;
      return;
    }

    // Check if we're in tutorial mode (step 9)
    if (tutorialAttribute('wait_buy_land').has) {
      try {
        console.log('Tutorial mode: Simulating land purchase locally');

        // Optimistically update the land in the store (same as real purchase)
        const updatedLand = {
          ...land,
          token: selectedToken,
          tokenUsed: selectedToken?.address || '',
          tokenAddress: selectedToken?.address || '',
          token_used: selectedToken?.address || '',
          token_address: selectedToken?.address || '',
          owner: account.address,
          stakeAmount: stakeAmount,
          sell_price: sellPriceAmount.toBignumberish(),
          block_date_bought: Date.now(),
          // @ts-ignore
          level: (land.level === 1
            ? 'Zero'
            : land.level === 2
              ? 'First'
              : 'Second') as CairoCustomEnum,
        };

        // Create a parsed entity for the updated land
        const parsedEntity = {
          entityId: land.location,
          models: {
            ponzi_land: {
              Land: updatedLand,
            },
          },
        };

        // Update the land store
        landStore.updateLand(parsedEntity);

        // Create a parsed entity for the stake
        const stakeEntity = {
          entityId: land.location,
          models: {
            ponzi_land: {
              LandStake: {
                location: land.location,
                amount: stakeAmount.toBignumberish(),
              },
            },
          },
        };

        // Update the land store with the stake
        landStore.updateLand(stakeEntity);

        // Play purchase sound
        gameSounds.play('buy');

        // Progress to next tutorial step
        nextStep();

        widgetsStore.closeWidget('land-info');

        console.log('Tutorial: Land purchase simulated successfully');
      } catch (error) {
        console.error('Tutorial: Error simulating land purchase', error);
      } finally {
        loading = false;
      }
      return;
    } else if (tutorialState.tutorialEnabled) {
      console.error('Tutorial: Land purchase failed, wrong time!');
      return;
    }

    // Normal mode - proceed with actual blockchain transaction
    let result;
    try {
      if (land.type == 'auction') {
        result = await bidLand(land.location, landSetup);
      } else {
        result = await buyLand(land.location, landSetup);
      }

      if (result?.transaction_hash) {
        console.log('Buying land with TX: ', result.transaction_hash);
        // Wait for transaction confirmation
        const txPromise = accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);

        const txReceipt = await txPromise;
        if (txReceipt?.statusReceipt !== 'SUCCEEDED') {
          throw new Error(
            `Transaction failed with status: ${txReceipt?.statusReceipt}`,
          );
        }

        gameSounds.play('buy');

        // Optimistically update the land in the store
        const updatedLand = {
          ...land,
          token: selectedToken,
          tokenUsed: selectedToken?.address || '',
          tokenAddress: selectedToken?.address || '',
          token_used: selectedToken?.address || '',
          token_address: selectedToken?.address || '',
          owner: account.address, // Assuming the owner is the current account
          stakeAmount: stakeAmount, // Set the stake amount
          sell_price: sellPriceAmount.toBignumberish(), // Ensure this is a raw value
          block_date_bought: Date.now() / 1000, // Set the current timestamp or appropriate value
          // @ts-ignore
          level: (land.level === 1
            ? 'Zero'
            : land.level === 2
              ? 'First'
              : 'Second') as CairoCustomEnum,
        };

        // Create a parsed entity for the updated land
        const parsedEntity = {
          entityId: land.location,
          models: {
            ponzi_land: {
              Land: updatedLand,
            },
          },
        };

        // Update the land store
        landStore.updateLand(parsedEntity);

        // Create a parsed entity for the stake
        const stakeEntity = {
          entityId: land.location,
          models: {
            ponzi_land: {
              LandStake: {
                location: land.location,
                amount: stakeAmount.toBignumberish(),
              },
            },
          },
        };

        // Update the land store with the stake
        landStore.updateLand(stakeEntity);
      }
    } catch (error) {
      console.error(
        `Error buying land for account ${accountManager!.getProvider()?.getWalletAccount()?.address} for location ${land.location} , transaction hash: ${result?.transaction_hash}`,
        error,
      );
      loading = false;
    } finally {
      loading = false;
    }
  }
</script>

{#if isActive}
  <div class="w-full h-full flex flex-col">
    {#if !account.isConnected}
      <!-- Wallet connection prompt -->
      <div class="flex flex-col items-center justify-center h-full gap-4">
        <div class="text-center">
          <h3 class="text-lg font-semibold mb-2">Connect Wallet Required</h3>
          <p class="text-sm opacity-75 mb-4">
            You need to connect your wallet to buy land and participate in the
            game.
          </p>
        </div>
        <Button
          class="w-full"
          onclick={async () => {
            await dojoAccountManager?.promptForLogin();
          }}
        >
          CONNECT WALLET
        </Button>
      </div>
    {:else}
      <!-- Buy tab content will go here -->
      <div class="flex-1 overflow-y-auto pb-2">
        <Label class="font-ponzi-number" for="token">Token</Label>
        <p class="-mt-1 mb-1 opacity-75 leading-none">
          Determines the land you are going to build. You stake this token and
          will receive this token when bought
        </p>
        <TokenSelect bind:value={tokenValue} variant="swap" />
        {#if tokenError}
          <p class="text-red-500 text-sm mt-1">{tokenError}</p>
        {/if}

        <div class="flex gap-2 items-center my-4">
          <div class="flex-1">
            <Label class="font-ponzi-number" for="sell">Sell Price</Label>
            <p class="-mt-1 mb-1 opacity-75 leading-none">
              What is paid to you when your land is bought out by another player
            </p>
            <div class="flex justify-center">
              {#if selectedToken}
                <RatioInput
                  bind:value1={sellPrice}
                  bind:value2={sellPriceBase}
                  token1={selectedToken}
                  token2={baseToken}
                  oninput={() => {
                    userHasInteracted = true;
                  }}
                  onadjust={() => {
                    userHasInteracted = true;
                  }}
                />
              {/if}
            </div>
          </div>
        </div>

        <div class="flex gap-2 items-center my-4">
          <div class="flex-1">
            <Label class="font-ponzi-number" for="stake">Stake Amount</Label>
            <p class="-mt-1 mb-1 opacity-75 leading-none">
              Amount you stake to secure your land position
            </p>
            <div class="flex justify-center">
              {#if selectedToken}
                <RatioInput
                  bind:value1={stakePrice}
                  bind:value2={stakePriceBase}
                  token1={selectedToken}
                  token2={baseToken}
                  oninput={() => {
                    userHasInteracted = true;
                  }}
                  onadjust={() => {
                    userHasInteracted = true;
                  }}
                />
              {/if}
            </div>
            {#if stakePriceError}
              <p class="text-red-500 text-sm mt-1">{stakePriceError}</p>
            {:else if stakeAmountError}
              <div class="mt-1 flex gap-2">
                <p class="text-red-500 text-sm">{stakeAmountError}</p>
                {#if stakeAmountError.includes("don't have enough") && insufficientStakeInfo}
                  <Button size="md" onclick={openSwapForStake}>
                    SWAP {insufficientStakeInfo.requiredAmount}
                    {insufficientStakeInfo.destinationToken.symbol}
                  </Button>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <div class="w-full">
          <TaxImpact
            sellAmountVal={sellPrice}
            stakeAmountVal={stakePrice}
            {selectedToken}
            {land}
            {auctionPrice}
            bind:hasAdvisorWarnings
          />
        </div>
      </div>

      <div
        class="sticky bottom-0 mt-auto bg-ponzi border-t border-gray-700 pt-4 pb-2 relative"
        style="z-index: 1"
      >
        {#if balanceError}
          <div class="mb-3">
            <p class="text-red-500 text-sm">{balanceError}</p>
            {#if insufficientBalanceInfo}
              <Button
                size="md"
                class="mt-2 border border-gray-600 bg-transparent text-white hover:bg-gray-700"
                onclick={openSwapForBalance}
              >
                {#if isSameToken}
                  SWAP {insufficientBalanceInfo.requiredAmount}
                  {insufficientBalanceInfo.destinationToken.symbol} ({land.type ===
                    'auction' && auctionPrice
                    ? auctionPrice
                    : land.sellPrice}+{stakeAmount})
                {:else}
                  SWAP {insufficientBalanceInfo.requiredAmount}
                  {insufficientBalanceInfo.destinationToken.symbol}
                {/if}
              </Button>
            {/if}
          </div>
        {/if}
        {#if loading}
          <Button class="w-full" disabled>
            buying <ThreeDots />
          </Button>
        {:else}
          <Button
            onclick={handleBuyClick}
            class="w-full"
            disabled={!isFormValid ||
              isOwner ||
              loading ||
              (tutorialState.tutorialEnabled && hasAdvisorWarnings)}
          >
            BUY FOR <span class="text-yellow-500">
              &nbsp;
              {#if land.type == 'auction'}
                {#await land?.getCurrentAuctionPrice(false)}
                  fetching...
                {:then price}
                  {price}
                {/await}
              {:else}
                {land.sellPrice}
              {/if}
              &nbsp;
            </span>
            {land.token?.symbol}
            & STAKE
            <span class="text-yellow-500">
              &nbsp;{stakeAmount.toString()}&nbsp;
            </span>
            {selectedToken?.symbol}
          </Button>
          {#if totalCostInBase}
            <span class="text-gray-300 text-sm block mt-2">
              (Total: ≈{totalCostInBase.toString()}
              {baseToken.symbol})
            </span>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
{/if}
