<script lang="ts">
  import { useLands } from '$lib/api/land.svelte';
  import { selectedLandMeta, uiStore } from '$lib/stores/stores.svelte';
  import {
    hexStringToNumber,
    locationIntToString,
    shortenHex,
  } from '$lib/utils';
  import LandOverview from '../../land/land-overview.svelte';
  import { Button } from '../../ui/button';

  let landStore = useLands();

  const handleBuyLandClick = () => {
    console.log('Buy land clicked');

    uiStore.showModal = true;
    uiStore.modalType = 'buy';
    uiStore.modalData = {
      location: hexStringToNumber($selectedLandMeta!.location),
      // TODO: Enforce null checks here
      sellPrice: $selectedLandMeta!.sellPrice!,
      tokenUsed: $selectedLandMeta!.tokenUsed!,
      tokenAddress: $selectedLandMeta!.tokenAddress ?? '',
      owner: $selectedLandMeta!.owner || undefined,
    };
  };
</script>

<div class="flex gap-4 relative">
  {#if $selectedLandMeta}
    <LandOverview land={$selectedLandMeta} />
  {/if}
  <div class="w-full flex flex-col text-xl gap-1" style="line-height: normal;">
    <div class="flex w-full">
      <span class="w-full">Location :</span>
      <span class="w-full">
        {locationIntToString(
          hexStringToNumber($selectedLandMeta?.location ?? ''),
        )}
        <span class="text-gray-500 text-sm"
          >#{hexStringToNumber($selectedLandMeta?.location ?? '')}</span
        >
      </span>
    </div>
    <div class="flex w-full">
      <span class="w-full">Price :</span>
      <span class="w-full">{$selectedLandMeta?.sellPrice?.toString()}</span>
    </div>
    <div class="flex w-full">
      <span class="w-full">Remaining Stake :</span>
      <span class="w-full">{$selectedLandMeta?.stakeAmount?.toString()}</span>
    </div>
    <div class="flex w-full">
      <span class="w-full">Owner :</span>
      <a
        href={`https://sepolia.voyager.online/contract/${$selectedLandMeta?.owner}`}
        target="_blank"
        class="w-full">{shortenHex($selectedLandMeta?.owner)}</a
      >
    </div>
    <Button
      on:click={() => {
        handleBuyLandClick();
      }}
      class="mt-2 text-xl text-ponzi">BUY LAND</Button
    >
  </div>
</div>
