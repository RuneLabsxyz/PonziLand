<script lang="ts">
  import { getAuctionDataFromLocation } from '$lib/api/auction.svelte';
  import type { LandSetup } from '$lib/api/land.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import type { Auction } from '$lib/models.gen';
  import { selectedLand } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import Button from '../ui/button/button.svelte';

  let auctionInfo = $state<Auction>();
  let currentTime = $state(Date.now());

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
    const elapsedMinutes = (currentTime - startTime) / (60 * 1000);
    const decayFactor = Math.pow(0.99, elapsedMinutes); // Decay rate: 1% per minute
    const price = Math.max(startPrice * decayFactor, floorPrice); // Ensure not below floor price
    // Round down to 6 decimal places
    return Math.floor(price * 1e6) / 1e6;
  }

  $effect(() => {
    const owner =
      $selectedLand?.owner == null || $selectedLand?.owner == toHexWithPadding(0);
    if ($selectedLand && owner) {
      getAuctionDataFromLocation($selectedLand.location).then((res) => {
        if (res && res.length == 0) {
          return;
          // call the function to create auction
          // landStore?.auctionLand($selectedLand.location, 100, 1, '0x01853f03f808ae62dfbd8b8a4de08e2052388c40b9f91d626090de04bbc1f619');
        }
        auctionInfo = res[0].models.ponzi_land.Auction as Auction;
      });
    }

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
<Button
  on:click={() => {
    console.log('Buying land with data:', auctionInfo);

    const landSetup: LandSetup = {
      tokenForSaleAddress: '0x01853f03f808ae62dfbd8b8a4de08e2052388c40b9f91d626090de04bbc1f619', //BLUE
      salePrice: toHexWithPadding(1),
      amountToStake: toHexWithPadding(100),
      liquidityPoolAddress: toHexWithPadding(0),
    };

    if (!$selectedLand?.location) {
      return;
    }

    landStore?.bidLand($selectedLand?.location, landSetup).then(res => {
      console.log('Bought land:', res);
    });
  }}
>
  Buy for {currentPriceDerived()}
</Button>
