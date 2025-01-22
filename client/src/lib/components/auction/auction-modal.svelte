<script lang="ts">
  import { getAuctionDataFromLocation } from '$lib/api/auction.svelte';
  import type { LandSetup } from '$lib/api/land.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import type { Auction } from '$lib/models.gen';
  import {
    selectedLand,
    selectedLandMeta,
    uiStore,
  } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import Button from '../ui/button/button.svelte';
  import BuySellForm from '../buy/buy-sell-form.svelte';
  import type { Token } from '$lib/interfaces';
  import { Card } from '../ui/card';
  import CloseButton from '../ui/close-button.svelte';
  import BigNumber from 'bignumber.js';
  import { type BigNumberish } from 'starknet';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { Currency } from 'lucide-svelte';

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
  let currentPriceDisplay = $derived(currentPriceDerived?.toString());

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
  <Card class="flex flex-col min-w-96 min-h-96">
    <CloseButton onclick={handleCancelClick} />
    <p>
      StartTime: {new Date(
        parseInt(auctionInfo?.start_time as string, 16) * 1000,
      ).toLocaleString()}
    </p>
    <p>StartPrice: {startPrice}</p>
    <p>Current Price: {currentPriceDisplay}</p>
    <p>FloorPrice: {floorPrice}</p>

    <BuySellForm bind:selectedToken bind:stakeAmount bind:sellAmount />
    <Button on:click={handleBiddingClick}>
      Buy for {currentPriceDisplay}
      XXX
    </Button>
  </Card>
</div>
