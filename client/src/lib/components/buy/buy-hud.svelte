<script lang="ts">
  import account from '$lib/account.svelte';
  import { useLands } from '$lib/api/land.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { selectedLandMeta, uiStore } from '$lib/stores/stores.svelte';
  import {
    hexStringToNumber,
    locationIntToString,
    padAddress,
    shortenHex,
    toHexWithPadding,
  } from '$lib/utils';
  import LandOverview from '../land/land-overview.svelte';
  import LandTaxesCalculator from '../land/land-taxes-calculator.svelte';
  import { Button } from '../ui/button';

  let landStore = useLands();

  const { store, client: sdk } = useDojo();

  const address = $derived(account.address);

  let isOwner = $derived($selectedLandMeta?.owner == padAddress(address ?? ''));

  const handleBuyLandClick = () => {
    console.log('Buy land clicked');

    uiStore.showModal = true;
    uiStore.modalData = {
      location: hexStringToNumber($selectedLandMeta!.location),
      sellPrice: $selectedLandMeta!.sellPrice ?? 0,
      tokenUsed: $selectedLandMeta!.tokenUsed ?? '',
      tokenAddress: $selectedLandMeta!.tokenAddress ?? '',
      owner: $selectedLandMeta!.owner || undefined,
    };
  };

  const handleClaimLandClick = () => {
    console.log('Claim land clicked');
    $selectedLandMeta!.claim().then((res) => {
      console.log('Claimed', res);
    });
  };

  const handleNukeLandClick = () => {
    console.log('Nuke Land Clicked');
    $selectedLandMeta?.nuke().then((res) => {
      console.log('Nuked', res);
    });
  };

  const handleGetTaxesClick = () => {
    console.log('Get Taxes Clicked');
    landStore?.getPendingTaxes($selectedLandMeta?.owner!).then((res) => {
      console.log('Taxes', res);
    });
  };
</script>

<div class="flex gap-4 relative">
  {#if isOwner}
    <div class="absolute -top-8 left-0 right-0">
      <div class="flex justify-center">
        <img src="/assets/ui/crown.png" alt="owner" class="h-7 w-8" />
      </div>
    </div>
  {/if}
  <LandOverview data={$selectedLandMeta} />
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
    <Button
      on:click={() => {
        handleBuyLandClick();
      }}
      class="mt-2 text-xl text-ponzi">BUY LAND</Button
    >
    <Button
      on:click={() => {
        handleNukeLandClick();
      }}
      class="mt-2 text-xl text-ponzi">NUKE</Button
    >
    <Button
      on:click={() => {
        handleGetTaxesClick();
      }}
      class="mt-2 text-xl text-ponzi"
    >
      GET TAXES
    </Button>
    {#if isOwner}
      <Button
        on:click={() => {
          handleClaimLandClick();
        }}
        class="mt-2 text-xl text-ponzi">CLAIM</Button
      >
      <hr />
      <div>Claimable Taxes:</div>
      <LandTaxesCalculator />
    {/if}
  </div>
</div>
