<script lang="ts">
  import { selectedLandMeta, uiStore } from '$lib/stores/stores.svelte';
  import { locationIntToString, shortenHex } from '$lib/utils';
  import LandOverview from '../land/land-overview.svelte';
  import { Button } from '../ui/button';

  const handleBuyLandClick = () => {
    console.log('Buy land clicked');
    
    uiStore.showModal = true;
    uiStore.modalData = {
            location: $selectedLandMeta!.location,
            sellPrice: $selectedLandMeta!.sellPrice,
            tokenUsed: $selectedLandMeta!.tokenUsed,
            tokenAddress: $selectedLandMeta!.tokenAddress,
            owner: $selectedLandMeta!.owner || undefined,
          };

  };
</script>

<div class="flex gap-4">
  <LandOverview data={$selectedLandMeta} />
  <div class="w-full flex flex-col text-xl gap-1" style="line-height: normal;">
    <div class="flex w-full">
      <span class="w-full">Location :</span>
      <span class="w-full"
        >{locationIntToString($selectedLandMeta?.location)}</span
      >
    </div>
    <div class="flex w-full">
      <span class="w-full">Price :</span>
      <span class="w-full">{$selectedLandMeta?.sellPrice}</span>
    </div>
    <div class="flex w-full">
      <span class="w-full">Owner :</span>
      <a
        href={`https://sepolia.voyager.online/contract/${$selectedLandMeta?.owner}`}
        target="_blank"
        class="w-full">{shortenHex($selectedLandMeta?.owner)}</a
      >
    </div>
    <Button on:click={() => {handleBuyLandClick()}} class="mt-2 text-xl text-ponzi">BUY LAND</Button>
  </div>
</div>
