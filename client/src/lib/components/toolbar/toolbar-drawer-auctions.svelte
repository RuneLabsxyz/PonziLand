<script lang="ts">
  import { useDojo } from '$lib/contexts/dojo';
  import { useActiveAuctions } from '$lib/stores/stores.svelte';
  import LandInfoCard from '../land/land-info-card.svelte';
  import ScrollArea from '../ui/scroll-area/scroll-area.svelte';

  const { store, client: sdk, accountManager } = useDojo();

  let auctions = useActiveAuctions();

  let sortedAuctions = $derived.by(async () => {
    // get current price of the auctions and sort them
    const auctionsWithCurrentPrice = await Promise.all(
      $auctions.map(async (auction) => {
        return {
          ...auction,
          currentPrice: await auction.getCurrentAuctionPrice(),
        };
      }),
    );

    return auctionsWithCurrentPrice.sort((a, b) => {
      return (
        (a.currentPrice?.rawValue()?.toNumber() ?? 0) -
        (b.currentPrice?.rawValue()?.toNumber() ?? 0)
      );
    });
  });
</script>

<div class="text-lg font-semibold">Auctions</div>
<ScrollArea class="h-full w-full relative">
  <div class="flex flex-col">
    {#await sortedAuctions then auctions}
      {#each auctions as auction}
        <LandInfoCard land={auction} />
      {/each}
    {/await}
  </div>
</ScrollArea>
