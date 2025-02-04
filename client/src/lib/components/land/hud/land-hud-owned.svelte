<script lang="ts">
  import LandYieldInfo from '$lib/components/toolbar/land-yield-info.svelte';
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import LandOverview from '../../land/land-overview.svelte';

  const handleClaimLandClick = () => {
    console.log('Claim land clicked');
    $selectedLandMeta!.claim().then((res) => {
      console.log('Claimed', res);
    });
  };
</script>

<div class="flex gap-4 relative items-center p-4">
  <div class="absolute -top-8 left-0 right-0">
    <div class="flex justify-center">
      <div class="h-10 w-10">
        <img
          src="/assets/ui/icons/Icon_Crown.png"
          alt="owner"
          style="image-rendering: pixelated;"
        />
      </div>
    </div>
  </div>
  {#if $selectedLandMeta}
    <LandOverview land={$selectedLandMeta} />
  {/if}
  <div class="w-full text-shadow-none flex flex-col leading-none text-lg">
    {#if $selectedLandMeta?.tokenUsed}
      <div class="flex justify-between">
        <p class="opacity-50">Token</p>
        <p>
          {$selectedLandMeta?.token?.name}
        </p>
      </div>
    {/if}
    <div class="flex justify-between">
      <p class="opacity-50">Stake Remaining</p>
      <p>
        {$selectedLandMeta?.stakeAmount}
        {$selectedLandMeta?.token?.symbol}
      </p>
    </div>
    <div class="flex justify-between">
      <p class="opacity-50">Daily maintenance cost</p>
      <p class="text-red-500">
        {$selectedLandMeta?.sellPrice.rawValue().multipliedBy(0.02).toString()}
        {$selectedLandMeta?.token?.symbol}/h
      </p>
    </div>
    {#if $selectedLandMeta}
      <LandYieldInfo land={$selectedLandMeta} />
    {/if}
    <div class="flex justify-between">
      <p class="opacity-50">Sell price</p>
      <p>
        {$selectedLandMeta?.sellPrice}
        {$selectedLandMeta?.token?.symbol}
      </p>
    </div>
  </div>
</div>
