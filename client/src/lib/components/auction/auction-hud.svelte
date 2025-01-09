<script lang="ts">
  import { getAuctionDataFromLocation } from '$lib/api/auction.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import type { AuctionData } from '$lib/interfaces';
  import { tileHUD } from '$lib/stores/stores';

  let auctionInfo;

  let landStore = useLands();

  $effect(() => {
    const owner =
      $tileHUD?.owner == null ||
      $tileHUD?.owner ==
        '0x0000000000000000000000000000000000000000000000000000000000000000';

    if ($tileHUD && owner) {
      getAuctionDataFromLocation($tileHUD.location).then((res) => {
        console.log('data from component', res);
        if (res && res.length == 0) {
          console.log('no auction data');
          // call the function to create auction
          // landStore?.auctionLand($tileHUD.location, 100, 1, '0x01853f03f808ae62dfbd8b8a4de08e2052388c40b9f91d626090de04bbc1f619');
        }
      });
    }
  });
</script>

<div>Auction HUD</div>
