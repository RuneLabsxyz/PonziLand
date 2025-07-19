<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandSetup, LandWithActions } from '$lib/api/land';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import TokenSelect from '$lib/components/swap/token-select.svelte';
  import {
    nextStep,
    tutorialState,
  } from '$lib/components/tutorial/stores.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import Label from '$lib/components/ui/label/label.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { TabType } from '$lib/interfaces';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { bidLand, buyLand, landStore } from '$lib/stores/store.svelte';
  import { baseToken, tokenStore } from '$lib/stores/tokens.store.svelte';
  import { locationToCoordinates, padAddress } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import type { CairoCustomEnum } from 'starknet';
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

  let isOwner = $derived(
    padAddress(account.address ?? '') == padAddress(land.owner),
  );

  let tokenValue: string = $state('');
  let selectedToken = $derived(
    data.availableTokens.find((token) => token.address === tokenValue),
  );
  let stake: string = $state('');
  let stakeAmount: CurrencyAmount = $derived(
    CurrencyAmount.fromScaled(stake ?? 0, selectedToken),
  );
  let sellPrice: string = $state('');
  let sellPriceAmount: CurrencyAmount = $derived(
    CurrencyAmount.fromScaled(sellPrice ?? 0, selectedToken),
  );
  let loading = $state(false);

  let accountManager = useAccount();

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
    const selectedTokenBalance = tokenStore.balances.find(
      (balance) => balance.token.address === selectedToken?.address,
    );

    if (selectedTokenBalance === undefined) {
      return "You don't have any of this token";
    }

    const selectedTokenAmount = CurrencyAmount.fromUnscaled(
      selectedTokenBalance?.balance,
      selectedToken,
    );

    if (selectedTokenAmount.rawValue().isLessThanOrEqualTo(parsedStake)) {
      return `You don't have enough ${selectedToken.symbol} to stake (max: ${selectedTokenAmount.toString()})`;
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
      const baseTokenBalance = tokenStore.balances.find(
        (balance) => balance.token.address === baseToken?.address,
      );
      if (!baseTokenBalance) {
        return `You don't have any ${baseToken?.symbol}`;
      }
      const baseTokenAmount = CurrencyAmount.fromUnscaled(
        baseTokenBalance.balance,
        baseToken,
      );
      if (baseTokenAmount.rawValue().isLessThan(landPrice.rawValue())) {
        return `You don't have enough ${baseToken?.symbol} to buy this land (max: ${baseTokenAmount.toString()})`;
      }
      // If has enough for price then check if the selected token is baseToken and add the stake amount
      if (selectedToken?.address === baseToken?.address) {
        const totalCost = landPrice.add(stakeAmount);
        if (baseTokenAmount.rawValue().isLessThan(totalCost.rawValue())) {
          return `You don't have enough ${baseToken?.symbol} to buy this land and stake (max: ${baseTokenAmount.toString()})`;
        }
      }
    }

    // If not auction, Do the same checks but with land.token for baseToken and selectedToken
    if (land.type !== 'auction') {
      console.log('Checking land token balance for buy');
      const landTokenBalance = tokenStore.balances.find(
        (balance) => balance.token.address === land.token?.address,
      );
      if (!landTokenBalance) {
        return `You don't have any ${land.token?.symbol}`;
      }
      const landTokenAmount = CurrencyAmount.fromUnscaled(
        landTokenBalance.balance,
        land.token,
      );
      if (landTokenAmount.rawValue().isLessThan(land.sellPrice.rawValue())) {
        return `You don't have enough ${land.token?.symbol} to buy this land (max: ${landTokenAmount.toString()})`;
      }

      const selectedAddress = padAddress(selectedToken?.address ?? '');
      const landTokenAddress = padAddress(land.token?.address ?? '');
      console.log(
        'selectedAddress',
        selectedAddress,
        'landTokenAddress',
        landTokenAddress,
      );

      // if selectedToken is land.token, check if has enough for stake
      if (selectedAddress === landTokenAddress) {
        const totalCost = land.sellPrice.add(stakeAmount);
        console.log('totalCost', totalCost);
        if (landTokenAmount.rawValue().isLessThan(totalCost.rawValue())) {
          return `You don't have enough ${land.token?.symbol} to stake (max: ${landTokenAmount.toString()})`;
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
    console.log('Buy land');

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
      currentPrice = await land.getCurrentAuctionPrice();
    }

    console.log('baseToken', baseToken?.address);

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address || '',
      salePrice: sellPriceAmount,
      amountToStake: stakeAmount,
      tokenAddress:
        land.type == 'auction'
          ? (baseToken?.address ?? '')
          : (land.tokenAddress ?? ''),
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
        console.log('Land updated optimistically in store:', updatedLand);

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
        console.log('Stake updated in store:', stakeEntity);

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
    <!-- Buy tab content will go here -->
    <Label class="font-ponzi-number" for="token">Token</Label>
    <p class="-mt-1 mb-1 opacity-75 leading-none">
      Determines the land you are going to build. You stake this token and will
      receive this token when bought
    </p>
    <TokenSelect
      bind:value={tokenValue}
      class={tutorialState.tutorialProgress == 6
        ? 'border border-yellow-500 animate-pulse'
        : ''}
    />
    {#if tokenError}
      <p class="text-red-500 text-sm mt-1">{tokenError}</p>
    {/if}

    <div class="flex gap-2 items-center my-4">
      <div class="flex-1">
        <Label class="font-ponzi-number" for="stake">Stake Amount</Label>
        <p class="-mt-1 mb-1 leading-none opacity-75">
          Locked value that will be used to pay taxes and make your land survive
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
            {#await land?.getCurrentAuctionPrice()}
              fetching...
            {:then price}
              {price}
            {/await}
          {:else}
            {land.sellPrice}
          {/if}
          &nbsp;
        </span>
        {#if land.type == 'auction'}
          {baseToken?.symbol}
        {:else}
          {land.token?.symbol}
        {/if}
      </Button>
    {/if}
  </div>
{/if}
