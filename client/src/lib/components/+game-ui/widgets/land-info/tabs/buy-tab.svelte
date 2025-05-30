<script lang="ts">
  import type { LandSetup, LandWithActions } from '$lib/api/land';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import TokenSelect from '$lib/components/swap/token-select.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import Label from '$lib/components/ui/label/label.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { TabType } from '$lib/interfaces';
  import { bidLand, buyLand } from '$lib/stores/store.svelte';
  import { baseToken, tokenStore } from '$lib/stores/tokens.store.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import TaxImpact from '../tax-impact/tax-impact.svelte';
  import account from '$lib/account.svelte';
  import { padAddress } from '$lib/utils';
  import { buy_sound } from '$lib/sfx';

  let {
    land,
    activeTab = $bindable(),
    isActive = false,
  }: {
    land: LandWithActions;
    activeTab: TabType;
    isActive?: boolean;
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
    CurrencyAmount.fromScaled(stake, selectedToken),
  );
  let sellPrice: string = $state('');
  let sellPriceAmount: CurrencyAmount = $derived(
    CurrencyAmount.fromScaled(sellPrice, selectedToken),
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

  // Check if form is valid
  let isFormValid = $derived(
    !tokenError && !stakeAmountError && !sellPriceError,
  );

  async function handleBuyClick() {
    console.log('Buy land');

    // Double-check validation before proceeding
    if (!isFormValid) {
      console.error('Form validation failed');
      return;
    }

    let currentPrice: CurrencyAmount | undefined = land.sellPrice;

    if (land.type == 'auction') {
      currentPrice = await land.getCurrentAuctionPrice();
    }

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address || '',
      salePrice: sellPriceAmount,
      amountToStake: stakeAmount,
      tokenAddress: land?.tokenAddress ?? '',
      currentPrice: currentPrice ?? null,
    };

    if (!land) {
      console.error('No land selected');
      return;
    }

    loading = true;

    try {
      // const result = await landStore?.buyLand(land?.location, landSetup);

      let result;

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

        buy_sound.play();
        console.log('Bought land with TX: ', result.transaction_hash);
      }
    } catch (error) {
      console.error('Error buying land', error);
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
    <TokenSelect bind:value={tokenValue} />
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
          class={stakeAmountError ? 'border-red-500' : ''}
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
          class={sellPriceError ? 'border-red-500' : ''}
        />
        {#if sellPriceError}
          <p class="text-red-500 text-sm mt-1">{sellPriceError}</p>
        {/if}
      </div>
    </div>

    <TaxImpact
      sellAmountVal={sellPrice}
      stakeAmountVal={stake}
      {selectedToken}
      {land}
    />

    {#if loading}
      <Button class="mt-3 w-full" disabled>
        buying <ThreeDots />
      </Button>
    {:else}
      <Button
        onclick={handleBuyClick}
        class="mt-3 w-full"
        disabled={!isFormValid || isOwner}
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
