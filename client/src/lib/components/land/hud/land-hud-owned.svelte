<script lang="ts">
  import LandYieldInfo from '$lib/components/land/land-yield-info.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import { onMount } from 'svelte';
  import LandOverview from '../../land/land-overview.svelte';
  import { GAME_SPEED } from '$lib/const';

  let levelUpInfo = $state($selectedLandMeta?.getLevelInfo());

  onMount(() => {
    const interval = setInterval(() => {
      levelUpInfo = $selectedLandMeta?.getLevelInfo();
    }, 1000);

    return () => clearInterval(interval);
  });

  let timeLeft = $derived(
    levelUpInfo == undefined
      ? 0
      : (levelUpInfo.levelUpTime - levelUpInfo.timeSinceLastLevelUp) /
          GAME_SPEED,
  );

  let secondsLeft = $derived(timeLeft % 60);
  let minutesLeft = $derived(Math.floor(timeLeft / 60) % 60);
  let hoursLeft = $derived(Math.floor(timeLeft / 3600));
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
  <div class="w-full text-stroke-none flex flex-col leading-none text-xs">
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
    {#if $selectedLandMeta?.level ?? 1 < 3}
      <div class="flex justify-between">
        <p class="opacity-50">Level up in</p>
        <p>
          {hoursLeft}h {minutesLeft}m {secondsLeft}s
        </p>
      </div>
    {/if}

    <div class="flex h-8">
      {#if levelUpInfo?.canLevelUp}
        <Button
          onclick={async () => {
            console.log(
              'Result of levelup: ',
              await $selectedLandMeta?.levelUp(),
            );
          }}>Level Up</Button
        >
      {/if}
    </div>
  </div>
</div>
