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

<div class="flex gap-4 relative items-center p-4">
  {#if $selectedLandMeta}
    <LandOverview land={$selectedLandMeta} />
  {/if}
  <div class="w-full text-shadow-none flex flex-col leading-none text-lg">
    <div class="flex justify-between">
      <p class="opacity-50">Owner</p>
      <p class="text-[#1F75BC] hover:underline">
        <a
          href={`https://sepolia.voyager.online/contract/${$selectedLandMeta?.owner}`}
          target="_blank"
          class="w-full"
        >
          {shortenHex($selectedLandMeta?.owner)}
        </a>
      </p>
    </div>
    <div class="flex justify-between">
      <p class="opacity-50">Price</p>
      <p>
        {$selectedLandMeta?.sellPrice?.toString()}
        {$selectedLandMeta?.token?.symbol}
      </p>
    </div>
    <div class="flex justify-between">
      <p class="opacity-50">Remaining Stake</p>
      <p>
        {$selectedLandMeta?.stakeAmount?.toString()}
        {$selectedLandMeta?.token?.symbol}
      </p>
    </div>
  </div>
</div>
