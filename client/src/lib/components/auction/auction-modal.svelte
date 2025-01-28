<script lang="ts">
  import { getAuctionDataFromLocation } from '$lib/api/auction.svelte';
  import type { LandSetup } from '$lib/api/land.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import type { Token } from '$lib/interfaces';
  import type { Auction } from '$lib/models.gen';
  import {
    selectedLand,
    selectedLandMeta,
    uiStore,
  } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import BigNumber from 'bignumber.js';
  import BuySellForm from '../buy/buy-sell-form.svelte';
  import LandOverview from '../land/land-overview.svelte';
  import Button from '../ui/button/button.svelte';
  import { Card } from '../ui/card';
  import CloseButton from '../ui/close-button.svelte';

  let extended = $state(false);

  let auctionInfo = $state<Auction>();
  let currentTime = $state(Date.now());

  let selectedToken = $state<Token | undefined>();
  //TODO: Change defaults values into an error component
  let stakeAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled('100'));
  let sellAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled('10'));

  $effect(() => {});

  let currentPriceDerived = $derived.by(() => {
    if (auctionInfo && currentTime) {
      const startPrice = new BigNumber(auctionInfo.start_price as string, 16);
      const floorPrice = new BigNumber(auctionInfo.floor_price as string, 16);
      const startTime = parseInt(auctionInfo.start_time as string, 16) * 1000;
      return calculateCurrentPrice(
        startPrice,
        floorPrice,
        startTime,
        currentTime,
      );
    }
    return null;
  });

  // TODO: Put the auction token as a second parameter
  let startPrice = $derived(
    CurrencyAmount.fromUnscaled(auctionInfo?.start_price ?? 0).toString(),
  );
  let floorPrice = $derived(
    CurrencyAmount.fromUnscaled(auctionInfo?.floor_price ?? 0).toString(),
  );
  let currentPriceDisplay = $derived(
    CurrencyAmount.fromUnscaled(
      currentPriceDerived?.toNumber() ?? 0,
      $selectedLandMeta?.token,
    ),
  );

  let landStore = useLands();

  function calculateCurrentPrice(
    startPrice: BigNumber,
    floorPrice: BigNumber,
    startTime: number,
    currentTime = Date.now(),
  ): BigNumber {
    if (floorPrice > startPrice) {
      return floorPrice;
    }
    const elapsedHours = (currentTime - startTime) / (60 * 60 * 1000);

    const decayFactor = Math.pow(0.99, elapsedHours); // Decay rate: 1% per hour

    return BigNumber.max(startPrice.times(decayFactor), floorPrice); // Ensure not below floor price
  }

  async function handleBiddingClick() {
    console.log('Buying land with data:', auctionInfo);

    //fetch auction currentprice
    let currentPrice = await $selectedLandMeta?.getCurrentAuctionPrice();
    if (!currentPrice) {
      console.error(`Could not get current price ${currentPrice ?? ''}`);
      currentPrice = CurrencyAmount.fromScaled('1', $selectedLandMeta?.token);
    }

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address as string,
      salePrice: sellAmount,
      amountToStake: stakeAmount,
      liquidityPoolAddress: toHexWithPadding(0),
      tokenAddress: $selectedLandMeta?.tokenAddress as string,
      currentPrice: currentPrice, // Include a 10% margin on the bet amount
    };

    if (!$selectedLand?.location) {
      return;
    }

    landStore?.bidLand($selectedLand?.location, landSetup).then((res) => {
      console.log('Bought land:', res);
    });
  }

  function handleCancelClick() {
    uiStore.showModal = false;
    uiStore.modalData = null;
  }

  $effect(() => {
    if (!$selectedLand) {
      return;
    }

    console.log('Getting auction data for:', $selectedLand.location);
    getAuctionDataFromLocation($selectedLand.location).then((res) => {
      console.log('Auction data:', res);
      if (res.length === 0) {
        return;
      }
      auctionInfo = res[0].models.ponzi_land.Auction as Auction;
    });

    const interval = setInterval(() => {
      currentTime = Date.now();
    }, 1000);

    return () => clearInterval(interval);
  });
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
          {#if $selectedLandMeta}
            <LandOverview land={$selectedLandMeta} size="lg" />
          {/if}
          <div class="text-shadow-none">0 watching</div>
          <div class="flex items-center gap-1">
            {#each currentPriceDisplay.toString() as char}
              {#if char === '.'}
                <div class="text-ponzi-huge text-3xl">.</div>
              {:else}
                <div
                  class="text-ponzi-huge text-3xl bg-[#2B2B3D] p-2 text-[#f2b545]"
                >
                  {char}
                </div>
              {/if}
            {/each}
          </div>
          <div class="text-ponzi-huge text-3xl"></div>
          <div class="flex items-center gap-2">
            <div class="text-3xl text-ponzi-huge text-white">
              {$selectedLandMeta?.token?.symbol}
            </div>
            <img
              class="w-6 h-6"
              src={$selectedLandMeta?.token?.images.icon}
              alt="{$selectedLandMeta?.token?.symbol} icon"
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
        {#if extended}
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
