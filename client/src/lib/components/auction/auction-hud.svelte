<script lang="ts">
  import { getAuctionDataFromLocation } from '$lib/api/auction.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import type { AuctionData } from '$lib/interfaces';
  import type { Auction } from '$lib/models.gen';
  import { tileHUD } from '$lib/stores/stores';
  import { toHexWithPadding } from '$lib/utils';

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
      $tileHUD?.owner == null || $tileHUD?.owner == toHexWithPadding(0);
    if ($tileHUD && owner) {
      getAuctionDataFromLocation($tileHUD.location).then((res) => {
        if (res && res.length == 0) {
          return;
          // call the function to create auction
          // landStore?.auctionLand($tileHUD.location, 100, 1, '0x01853f03f808ae62dfbd8b8a4de08e2052388c40b9f91d626090de04bbc1f619');
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
<pre class="text-ponzi">{JSON.stringify(auctionInfo, null, 2)}</pre>
