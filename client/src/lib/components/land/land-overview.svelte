<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { cn, locationIntToString } from '$lib/utils';
  import LandDisplay from './land-display.svelte';
  import { GAME_SPEED, LEVEL_UP_TIME } from '$lib/const';
  import { onMount } from 'svelte';
  import { Progress } from '../ui/progress';
  import Button from '../ui/button/button.svelte';

  const { land, size = 'sm' }: { land: LandWithActions; size?: 'sm' | 'lg' } =
    $props();

  // TODO: Find a better place to put it, so that we don't have multiple updates in parallel
  let levelUpInfo = $state(land.getLevelInfo());

  onMount(() => {
    const interval = setInterval(() => {
      levelUpInfo = land.getLevelInfo();
    }, 1000);

    return () => clearInterval(interval);
  });

  const OFF_IMAGE = '/ui/star/off.png';
  const ON_IMAGE = '/ui/star/on.png';
</script>

<div class="flex flex-col">
  <div
    class="flex items-center justify-center relative
    {size == 'lg' ? 'h-48 w-48' : 'h-24 w-24'}"
  >
    {#if land.type == 'auction'}
      <LandDisplay auction class="scale-125" />
    {:else if land.type == 'grass'}
      <LandDisplay grass seed={land.location} class="scale-125" />
    {:else if land.type == 'house'}
      <LandDisplay token={land.token} level={land.level} class="scale-125" />
    {/if}
    <div class="absolute top-0 left-0 -mt-1 leading-none">
      <span class="text-ponzi {size == 'lg' ? 'text-xl' : 'text-lg'}"
        >{locationIntToString(land.location)}</span
      >
    </div>
    {#if land.type == 'house'}
      <div
        class="absolute -bottom-3 left-0 w-full leading-none flex flex-row justify-center"
      >
        <img
          src={land.level >= 1 ? ON_IMAGE : OFF_IMAGE}
          class="w-5"
          alt="no star"
        />

        <img
          src={land.level >= 2 ? ON_IMAGE : OFF_IMAGE}
          class="w-5"
          alt="no star"
        />

        <img
          src={land.level >= 3 ? ON_IMAGE : OFF_IMAGE}
          class="w-5"
          alt="no star"
        />
      </div>
    {/if}
  </div>
  <!-- Also show the progress bar for the next level -->
  {#if land.type == 'house' && land.level < 3}
    <div class="pt-4 w-full leading-none flex flex-col justify-center">
      <div class="fw-full bg-white h-2">
        <Progress
          value={levelUpInfo.timeSinceLastLevelUp}
          max={levelUpInfo.levelUpTime}
          class={cn('w-full p-0 h-2')}
          color={levelUpInfo.canLevelUp ? 'green' : undefined}
        ></Progress>
      </div>
      <div class="flex h-8 pt-2">
        {#if levelUpInfo?.canLevelUp}
          <Button
            onclick={async () => {
              console.log('Result of levelup: ', await land?.levelUp());
            }}>Level Up</Button
          >
        {/if}
      </div>
    </div>
  {/if}
</div>
