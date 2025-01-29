<script lang="ts">
  import { getAuctionDataFromLocation } from '$lib/api/auction.svelte';
  import type { LandSetup } from '$lib/api/land.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import type { Auction } from '$lib/models.gen';
  import { selectedLand, selectedLandMeta } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import Button from '../../ui/button/button.svelte';
  import BuySellForm from '../../buy/buy-sell-form.svelte';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import BigNumber from 'bignumber.js';
  import LandOverview from '../land-overview.svelte';

  let auctionInfo = $state<Auction>();
  let currentTime = $state(Date.now());

  let selectedToken = $state<Token | undefined>();
  //TODO: Change defaults values into an error component
  let stakeAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled(100));
  let sellAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled(10));

  let startPrice = $derived(
    CurrencyAmount.fromUnscaled(auctionInfo?.start_price ?? 0),
  );
  let floorPrice = $derived(
    CurrencyAmount.fromUnscaled(auctionInfo?.floor_price ?? 0),
  );

  let currentPriceDerived = $derived(() => {
    if (auctionInfo && currentTime) {
      // TODO: Move this function to a dedicated api store
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

  let landStore = useLands();

  function calculateCurrentPrice(
    startPrice: CurrencyAmount,
    floorPrice: CurrencyAmount,
    startTime: number,
    currentTime = Date.now(),
  ): CurrencyAmount {
    if (floorPrice > startPrice) {
      return floorPrice;
    }

    const elapsedHours = (currentTime - startTime) / (60 * 60 * 1000);
    const decayFactor = Math.pow(0.99, elapsedHours); // Decay rate: 1% per hour
    const price = BigNumber.max(
      startPrice.rawValue().multipliedBy(decayFactor),
      floorPrice.rawValue(),
    );

    // Create a new currency amount with the estimation of the price
    return CurrencyAmount.fromRaw(
      price.sd(4, BigNumber.ROUND_CEIL),
      selectedToken,
    );
  }

  async function handleBiddingClick() {
    console.log('Buying land with data:', auctionInfo);

    //fetch auction currentprice
    let currentPrice = await $selectedLandMeta?.getCurrentAuctionPrice();
    if (!currentPrice) {
      console.error(`Could not get current price ${currentPrice ?? ''}`);
      // TODO: Show a proper toast
      return;
    }

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address as string,
      salePrice: sellAmount,
      amountToStake: stakeAmount,
      liquidityPoolAddress: toHexWithPadding(0),
      tokenAddress: $selectedLandMeta?.tokenAddress as string,
      currentPrice: currentPrice,
    };

    if (!$selectedLand?.location) {
      return;
    }

    landStore?.bidLand($selectedLand?.location, landSetup).then((res) => {
      console.log('Bought land:', res);
    });
  }

  $effect(() => {
    if (!$selectedLand) {
      return;
    }

    // TODO: Move this to a dedicated api store
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

<div class="flex gap-4 relative items-center border-ponzi-auction -m-2 p-6">
  {#if $selectedLandMeta}
    <LandOverview land={$selectedLandMeta} />
  {/if}
  <div class="w-full text-shadow-none flex flex-col leading-none text-lg">
    <div class="flex justify-between text-yellow-500">
      <p class="opacity-50">Owner:</p>
      <p>Under Auction</p>
    </div>
    <div class="flex justify-between text-yellow-500">
      <p class="opacity-50">Current Price</p>
      <p class="text-right">
        {currentPriceDerived()}
        {$selectedLandMeta?.token?.symbol}
      </p>
    </div>
  </div>
</div>

<style>
  .border-ponzi-auction {
    background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23F2B545FF' stroke-width='10' stroke-dasharray='20%2c20' stroke-dashoffset='0' stroke-linecap='butt'/%3e%3c/svg%3e");
  }
</style>
