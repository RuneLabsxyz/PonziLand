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

  let auctionInfo = $state<Auction>();
  let currentTime = $state(Date.now());

  let selectedToken = $state<Token | null>(null);
  //TODO: Change defaults values into an error component
  let stakeAmount = $state<number>(100);
  let sellAmount = $state<number>(100);

  let currentPriceDerived = $derived(() => {
    if (auctionInfo && currentTime) {
      const startPrice = parseInt(auctionInfo.start_price as string, 16);
      const floorPrice = parseInt(auctionInfo.floor_price as string, 16);
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
    startPrice: number,
    floorPrice: number,
    startTime: number,
    currentTime = Date.now(),
  ): number {
    if (floorPrice > startPrice) {
      return floorPrice;
    }
    const elapsedHours = (currentTime - startTime) / (60 * 60 * 1000);
    const decayFactor = Math.pow(0.99, elapsedHours); // Decay rate: 1% per hour
    const price = Math.max(startPrice * decayFactor, floorPrice); // Ensure not below floor price
    // Round down to 6 decimal places
    return Math.floor(price);
  }

  async function handleBiddingClick() {
    console.log('Buying land with data:', auctionInfo);

    //fetch auction currentprice
    let currentPrice = await $selectedLandMeta?.getCurrentAuctionPrice();
    if (!currentPrice) {
      console.error(`Could not get current price ${currentPrice ?? ''}`);
      currentPrice = 10000000000000000000000n;
    }

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address as string,
      salePrice: sellAmount,
      amountToStake: stakeAmount,
      liquidityPoolAddress: toHexWithPadding(0),
      tokenAddress: $selectedLandMeta?.tokenAddress as string,
      currentPrice: currentPrice + currentPrice / 10n,
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

<p>
  StartTime: {new Date(
    parseInt(auctionInfo?.start_time as string, 16) * 1000,
  ).toLocaleString()}
</p>
<p>StartPrice: {parseInt(auctionInfo?.start_price as string, 16)}</p>
<p>Current Price: {currentPriceDerived()}</p>
<p>FloorPrice: {parseInt(auctionInfo?.floor_price as string, 16)}</p>

<BuySellForm bind:selectedToken bind:stakeAmount bind:sellAmount />
<Button on:click={handleBiddingClick}>
  Buy for {currentPriceDerived()}
  {$selectedLandMeta?.tokenUsed}
</Button>
