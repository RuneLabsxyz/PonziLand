<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import Button from '$lib/components/ui/button/button.svelte';
  import { cn, locationIntToString } from '$lib/utils';
  import { onMount } from 'svelte';
  import LandDisplay from './land-display.svelte';
  import LandLevelProgress from './land-level-progress.svelte';
  const {
    land,
    size = 'sm',
    isOwner = false,
    hideLevelUp = false,
  }: {
    land: LandWithActions;
    size?: 'xs' | 'sm' | 'lg';
    isOwner?: boolean;
    hideLevelUp?: boolean;
  } = $props();

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

<div
  class={cn('flex flex-col justify-center items-center', {
    'w-48': size === 'lg',
    'w-24': size === 'sm',
    'w-16': size === 'xs',
  })}
>
  <div
    class={cn('flex items-center justify-center relative', {
      'h-48 w-48': size === 'lg',
      'h-24 w-24': size === 'sm',
      'h-[4.5rem] w-[4.5rem]': size === 'xs',
    })}
  >
    {#if land.type == 'auction'}
      <LandDisplay auction class="scale-125" />
    {:else if land.type == 'grass'}
      <LandDisplay grass seed={land.location} class="scale-125" />
    {:else if land.type == 'house'}
      <LandDisplay token={land.token} level={land.level} class="scale-125" />
    {/if}
    <div class="absolute top-0 left-0 -mt-1 leading-none">
      <span
        class={cn('text-ponzi', {
          'text-xl': size === 'lg',
          'text-lg': size === 'sm',
          'text-sm': size === 'xs',
        })}
      >
        {locationIntToString(land.location)}
      </span>
      <span class={cn('opacity-50', { 'text-xs': size === 'xs' })}
        >#{new Number(land.location).toString()}</span
      >
    </div>
    {#if land.type == 'house'}
      <div
        class="absolute -bottom-3 left-0 w-full leading-none flex flex-row justify-center"
      >
        <img
          src={land.level >= 1 ? ON_IMAGE : OFF_IMAGE}
          class={cn({
            'w-8': size === 'lg',
            'w-5': size === 'sm',
            'w-3': size === 'xs',
          })}
          alt="no star"
        />

        <img
          src={land.level >= 2 ? ON_IMAGE : OFF_IMAGE}
          class={cn({
            'w-8': size === 'lg',
            'w-5': size === 'sm',
            'w-3': size === 'xs',
          })}
          alt="no star"
        />

        <img
          src={land.level >= 3 ? ON_IMAGE : OFF_IMAGE}
          class={cn({
            'w-8': size === 'lg',
            'w-5': size === 'sm',
            'w-3': size === 'xs',
          })}
          alt="no star"
        />
      </div>
    {/if}
  </div>
  <!-- Also show the progress bar for the next level -->
  {#if land.type == 'house' && land.level < 3 && !hideLevelUp}
    <div
      class={cn('mt-6 leading-none flex flex-col justify-center items-center', {
        'min-w-40': size === 'lg',
        'min-w-28': size === 'sm',
        'min-w-20': size === 'xs',
      })}
    >
      {#if levelUpInfo?.canLevelUp && isOwner}
        <div class="flex h-8 mb-4 animate-pulse">
          <Button
            size={size == 'xs' ? 'sm' : 'md'}
            onclick={async () => {
              await land?.levelUp();
            }}
            >Upgrade to&nbsp;<small>lvl</small
            >&nbsp;{levelUpInfo?.expectedLevel}
          </Button>
        </div>
      {:else}
        <LandLevelProgress
          class={cn('w-full p-0', size == 'xs' ? 'h-6' : 'h-8')}
          {levelUpInfo}
        />
      {/if}
    </div>
  {/if}
</div>
