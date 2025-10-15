<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandSetup, LandWithActions } from '$lib/api/land';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import {
    nextStep,
    tutorialState,
  } from '$lib/components/tutorial/stores.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import Label from '$lib/components/ui/label/label.svelte';
  import TokenSelect from '$lib/components/ui/token/token-select.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import type { TabType, Token } from '$lib/interfaces';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { bidLand, buyLand, landStore } from '$lib/stores/store.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { locationToCoordinates, padAddress } from '$lib/utils';
  import { formatWithoutExponential } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import type { CairoCustomEnum } from 'starknet';
  import { untrack } from 'svelte';
  import TaxImpact from '../tax-impact/tax-impact.svelte';

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

  let isOwner = $derived(
    padAddress(account.address ?? '') == padAddress(land.owner),
  );

  let tokenValue: Token | string | undefined = $state(data.mainCurrencyAddress);
  let selectedToken: Token | undefined = $derived.by(() => {
    if (typeof tokenValue === 'string') {
      return data.availableTokens.find(
        (token: Token) => token.address === tokenValue,
      );
    }
    return tokenValue;
  });

  let stake: string = $derived.by(() => {
    if (!selectedToken) return '';

    return untrack(() => {
      try {
        const sellPriceNum = parseFloat(sellPrice);
        if (isNaN(sellPriceNum) || sellPriceNum <= 0) return '';
        return sellPriceNum.toString();
      } catch (error) {
        return '';
      }
    });
  });
  let stakeAmount: CurrencyAmount = $derived.by(() => {
    if (!selectedToken) return CurrencyAmount.fromScaled(0, baseToken);
    return CurrencyAmount.fromScaled(stake ?? 0, selectedToken);
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

  let sellPrice: string = $derived.by(() => {
    if (!selectedToken) return '';
    return untrack(() => {
      let originalPrice: CurrencyAmount;
      let originalToken: Token;

      if (land.type == 'auction') {
        if (!auctionPrice) return '';
        originalPrice = auctionPrice;
        originalToken = land.token!;
      } else {
        originalPrice = land.sellPrice;
        originalToken = land.token!;
      }

      // If tokens are the same, no conversion needed
      if (
        padAddress(originalToken.address) === padAddress(selectedToken.address)
      ) {
        return originalPrice.toString();
      }

      // Try to convert the price to the selected token
      const convertedPrice = walletStore.convertTokenAmount(
        originalPrice,
        originalToken,
        selectedToken,
      );
      // If conversion is successful, return the converted amount, otherwise return original
      return convertedPrice
        ? formatWithoutExponential(convertedPrice.rawValue().toString(), 3)
        : formatWithoutExponential(originalPrice.rawValue().toString(), 3);
    });
  });

  let sellPriceAmount: CurrencyAmount = $derived.by(() => {
    if (!selectedToken) return CurrencyAmount.fromScaled(0, baseToken);
    return CurrencyAmount.fromScaled(sellPrice ?? 0, selectedToken);
  });

  let sellPriceInBaseCurrency: CurrencyAmount | null = $derived.by(() => {
    if (!selectedToken || !sellPriceAmount) return null;

    // If already in base currency, return null (no conversion needed)
    if (padAddress(selectedToken.address) === padAddress(baseToken.address)) {
      return null;
    }

    return walletStore.convertTokenAmount(
      sellPriceAmount,
      selectedToken,
      baseToken,
    );
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

  let stakeAmountError = $derived.by(() => {
    if (!stake || !stake.toString().trim()) {
      return 'Stake amount is required';
    }

    let parsedStake = parseFloat(stake);
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

    let parsedSellPrice = parseFloat(sellPrice);
    if (isNaN(parsedSellPrice) || parsedSellPrice <= 0) {
      return 'Sell price must be a number greater than 0';
    }

    return null;
  });

  let balanceError = $derived.by(() => {
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
          stake ?? 0,
          land.token!,
        );
        const totalCost = landPrice.add(stakeAmountInLandToken);
        if (landTokenAmount.rawValue().isLessThan(totalCost.rawValue())) {
          return `You don't have enough ${land.token?.symbol} to buy this land and stake (max: ${landTokenAmount.toString()})`;
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

      // if selectedToken is land.token, check if has enough for stake
      if (selectedAddress === landTokenAddress) {
        try {
          // Convert stakeAmount to the same token as land.sellPrice to avoid currency mismatch
          const stakeAmountInLandToken = CurrencyAmount.fromScaled(
            stake ?? 0,
            land.token!,
          );
          const totalCost = land.sellPrice.add(stakeAmountInLandToken);

          if (landTokenAmount.rawValue().isLessThan(totalCost.rawValue())) {
            return `You don't have enough ${land.token?.symbol} to stake (max: ${landTokenAmount.toString()})`;
          }
        } catch (error) {
          return 'Error calculating total cost for stake';
        }
      }
    }

    return null;
  });

  // Check if form is valid
  let isFormValid = $derived(
    !tokenError && !stakeAmountError && !sellPriceError && !balanceError,
  );

  async function handleBuyClick() {
    loading = true;

    if (tutorialState.tutorialProgress == 7) {
      nextStep();
      return;
    }

    // Double-check validation before proceeding
    if (!isFormValid) {
      console.error('Form validation failed');
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
      return;
    }

    let result;
    try {
      if (land.type == 'auction') {
        result = await bidLand(land.location, landSetup);
      } else {
        result = await buyLand(land.location, landSetup);
      }

      if (result?.transaction_hash) {
        // Only wait for the land update, not the total TX confirmation (should be fine)
        const txPromise = accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
        const landPromise = land.wait();
        await Promise.any([txPromise, landPromise]);
        console.log('Buying land with TX: ', result.transaction_hash);
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
          block_date_bought: Date.now(), // Set the current timestamp or appropriate value
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
                amount: stakeAmount.toBignumberish(), // Ensure this is the raw value of the stake
              },
            },
          },
        };

        // Update the land store with the stake
        landStore.updateLand(stakeEntity);

        const coordinates = locationToCoordinates(land.location);
        const updatedLandOnIndexer = await landStore.waitForOwnerChange(
          coordinates.x,
          coordinates.y,
          account.address ?? '',
          30000,
        );
        console.log('Purchase confirmed on-indexer:', updatedLandOnIndexer);
        gameSounds.play('buy');
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
  <div class="w-full h-full">
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
      <Label class="font-ponzi-number" for="token">Token</Label>
      <p class="-mt-1 mb-1 opacity-75 leading-none">
        Determines the land you are going to build. You stake this token and
        will receive this token when bought
      </p>
      <TokenSelect
        bind:value={tokenValue}
        variant="swap"
        class={tutorialState.tutorialProgress == 6
          ? 'border border-yellow-500 animate-pulse'
          : ''}
      />
      {#if tokenError}
        <p class="text-red-500 text-sm mt-1">{tokenError}</p>
      {/if}

      <div class="flex gap-2 my-4">
        <div class="flex-1">
          <Label class="font-ponzi-number" for="stake">Stake Amount</Label>
          <p class="-mt-1 mb-1 leading-none opacity-75">
            Locked value that will be used to pay taxes and make your land
            survive
          </p>
          <Input
            id="stake"
            type="number"
            bind:value={stake}
            class="{stakeAmountError
              ? 'border-red-500'
              : ''} {tutorialState.tutorialProgress == 6
              ? 'border border-yellow-500 animate-pulse'
              : ''}"
          />
          {#if stakeAmountInBaseCurrency}
            <p class=" text-gray-500 mt-1">
              ≈ {stakeAmountInBaseCurrency.toString()}
              {baseToken.symbol}
            </p>
          {/if}
          {#if stakeAmountError}
            <p class="text-red-500 text-sm mt-1">{stakeAmountError}</p>
          {/if}
        </div>
        <div class="flex-1">
          <Label class="font-ponzi-number" for="sell">Sell Price</Label>
          <p class="-mt-1 mb-1 opacity-75 leading-none">
            What is paid to you when your land is bought out by another player
          </p>
          <Input
            id="sell"
            type="number"
            bind:value={sellPrice}
            class="{sellPriceError
              ? 'border-red-500'
              : ''} {tutorialState.tutorialProgress == 6
              ? 'border border-yellow-500 animate-pulse'
              : ''}"
          />
          {#if sellPriceInBaseCurrency}
            <p class=" text-gray-500 mt-1">
              ≈ {sellPriceInBaseCurrency.toString()}
              {baseToken.symbol}
            </p>
          {/if}
          {#if sellPriceError}
            <p class="text-red-500 text-sm mt-1">{sellPriceError}</p>
          {/if}
        </div>
      </div>

      <div
        class="w-full {tutorialState.tutorialProgress == 7
          ? 'border border-yellow-500 animate-pulse'
          : ''}"
      >
        <TaxImpact
          sellAmountVal={sellPrice}
          stakeAmountVal={stake}
          {selectedToken}
          {land}
          {auctionPrice}
        />
      </div>

      {#if balanceError}
        <p class="text-red-500 text-sm mt-1">{balanceError}</p>
      {/if}

      {#if loading}
        <Button class="mt-3 w-full" disabled>
          buying <ThreeDots />
        </Button>
      {:else}
        <Button
          onclick={handleBuyClick}
          class="mt-3 w-full"
          disabled={!isFormValid || isOwner || loading}
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
        {#if land.token && selectedToken}
          {@const landPriceInBase =
            land.type == 'auction' && auctionPrice
              ? walletStore.convertTokenAmount(
                  auctionPrice,
                  land.token,
                  baseToken,
                )
              : walletStore.convertTokenAmount(
                  land.sellPrice,
                  land.token,
                  baseToken,
                )}
          {@const stakeInBase =
            stakeAmountInBaseCurrency ||
            (padAddress(selectedToken.address) === padAddress(baseToken.address)
              ? stakeAmount
              : null)}
          <span class="text-gray-300 text-sm block">
            {#if landPriceInBase && stakeInBase}
              (Total: ≈{landPriceInBase.add(stakeInBase).toString()}
              {baseToken.symbol})
            {:else if landPriceInBase && padAddress(selectedToken.address) === padAddress(baseToken.address)}
              (Total: ≈{landPriceInBase.add(stakeAmount).toString()}
              {baseToken.symbol})
            {:else if padAddress(land.token.address) === padAddress(baseToken.address) && stakeInBase}
              (Total: ≈{land.type == 'auction' && auctionPrice
                ? auctionPrice.add(stakeInBase).toString()
                : land.sellPrice.add(stakeInBase).toString()}
              {baseToken.symbol})
            {:else if padAddress(land.token.address) === padAddress(baseToken.address) && padAddress(selectedToken.address) === padAddress(baseToken.address)}
              (Total: ≈{land.type == 'auction' && auctionPrice
                ? auctionPrice.add(stakeAmount).toString()
                : land.sellPrice.add(stakeAmount).toString()}
              {baseToken.symbol})
            {/if}
          </span>
        {/if}
      {/if}
    {/if}
  </div>
{/if}
