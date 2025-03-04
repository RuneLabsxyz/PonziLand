<script lang="ts">
  import type { LandSetup } from '$lib/api/land.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { Token } from '$lib/interfaces';
  import type { Auction } from '$lib/models.gen';
  import {
    selectedLand,
    selectedLandMeta,
    uiStore,
    type SelectedLand,
  } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { onMount } from 'svelte';
  import BuySellForm from '../buy/buy-sell-form.svelte';
  import LandOverview from '../land/land-overview.svelte';
  import ThreeDots from '../loading/three-dots.svelte';
  import { Card } from '../ui/card';
  import CloseButton from '../ui/close-button.svelte';
  import { getLiquidityPoolFromToken } from '$lib/utils/liquidityPools';

  let landStore = useLands();
  let accountManager = useAccount();

  let extended = $state(false);
  let loading = $state(false);
  let fetching = $state(false);

  let land: SelectedLand = $state();

  onMount(() => {
    land = $selectedLandMeta;
  });

  let currentPrice = $state<CurrencyAmount>();
  let priceDisplay = $derived(currentPrice?.toString());

  // Form
  let selectedToken = $state<Token | undefined>();
  //TODO: Change defaults values into an error component
  let stakeAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled('10'));
  let sellAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled('1'));

  async function handleBiddingClick() {
    loading = true;

    //fetch auction currentprice
    if (!currentPrice) {
      currentPrice = CurrencyAmount.fromScaled('1', $selectedLandMeta?.token);
    }

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address as string,
      salePrice: sellAmount,
      amountToStake: stakeAmount,
      liquidityPool: getLiquidityPoolFromToken(selectedToken!),
      tokenAddress: $selectedLandMeta?.tokenAddress as string,
      currentPrice: currentPrice, // Include a 10% margin on the bet amount
    };

    console.log('Buying from land:', landSetup);

    if (!$selectedLand?.location) {
      loading = false;
      return;
    }

    try {
      const result = await landStore?.bidLand(
        $selectedLand?.location,
        landSetup,
      );

      if (result?.transaction_hash) {
        await accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
        console.log('Bought land with TX: ', result.transaction_hash);

        // Close the modal
        uiStore.showModal = false;
        uiStore.modalData = null;
      } else {
        loading = false;
      }
    } catch (e) {
      console.error('Error buying land:', e);
      loading = false;
    }
  }

  function handleCancelClick() {
    uiStore.showModal = false;
    uiStore.modalData = null;
  }

  $effect(() => {
    fetchCurrentPrice();

    const interval = setInterval(() => {
      console.log('Fetching current price');
      fetchCurrentPrice();
    }, 2000);

    return () => clearInterval(interval);
  });

  const fetchCurrentPrice = () => {
    if (!land) {
      return;
    }

    land?.getCurrentAuctionPrice().then((res) => {
      currentPrice = res;
      fetching = false;
    });
  };
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
>
  <Card class="flex flex-col min-w-96 min-h-96 bg-ponzi">
    <CloseButton onclick={handleCancelClick} />

    <h2 class="text-2xl">Buy Land</h2>
    <div class="flex flex-col items-center">
      <div class="flex gap-6">
        <div class="flex flex-col items-center justify-center p-5 gap-3">
          {#if land}
            <LandOverview {land} size="lg" />
          {/if}
          <div class="text-stroke-none">0 watching</div>
          <div class="flex items-center gap-1">
            {#if priceDisplay}
              {#each priceDisplay as char}
                {#if char === '.'}
                  <span class="text-ponzi-number text-3xl">.</span>
                {:else if char == ','}
                  <span class="text-ponzi-number text-3xl opacity-0"></span>
                {:else}
                  <span
                    class="text-ponzi-number text-3xl bg-[#2B2B3D] p-2 text-[#f2b545]"
                    >{char}</span
                  >
                {/if}
              {/each}
              {#if !fetching}
                <button
                  onclick={() => {
                    fetching = true;
                    fetchCurrentPrice();
                  }}
                  aria-label="Refresh balance"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 32 32"
                    width="32px"
                    height="32px"
                    fill="currentColor"
                    class="h-5 w-5"
                    ><path
                      d="M 6 4 L 6 6 L 4 6 L 4 8 L 2 8 L 2 10 L 6 10 L 6 26 L 17 26 L 17 24 L 8 24 L 8 10 L 12 10 L 12 8 L 10 8 L 10 6 L 8 6 L 8 4 L 6 4 z M 15 6 L 15 8 L 24 8 L 24 22 L 20 22 L 20 24 L 22 24 L 22 26 L 24 26 L 24 28 L 26 28 L 26 26 L 28 26 L 28 24 L 30 24 L 30 22 L 26 22 L 26 6 L 15 6 z"
                    /></svg
                  >
                </button>
              {/if}
            {:else}
              Fetching Price<ThreeDots />
            {/if}
          </div>
          <div class="text-ponzi-number text-3xl"></div>
          <div class="flex items-center gap-2">
            <div class="text-3xl text-ponzi-number text-white">
              {land?.token?.symbol}
            </div>
            <img
              class="w-6 h-6"
              src={land?.token?.images.icon}
              alt="{land?.token?.symbol} icon"
            />
          </div>
        </div>
        {#if extended}
          <div class="flex flex-col gap-4 w-96">
            <BuySellForm bind:selectedToken bind:stakeAmount bind:sellAmount />
          </div>
        {/if}
      </div>
      <div class="flex items-center justify-center w-36 my-4">
        {#if loading}
          <div class="text-5xl h-10 w-20">
            Buying<ThreeDots />
          </div>
        {:else if extended}
          <button onclick={handleBiddingClick}>
            <img
              src="/assets/ui/button/buy/button-buy.png"
              alt="buy-land"
              class=" hover:cursor-pointer hover:opacity-90"
            />
          </button>
        {:else}
          <button
            onclick={() => {
              console.log('extended');
              extended = true;
            }}
          >
            <img
              src="/assets/ui/button/buy/button-buy-glass.png"
              alt="buy-land"
              class=" hover:cursor-pointer hover:opacity-90"
            />
          </button>
        {/if}
      </div>
    </div>
  </Card>
</div>
