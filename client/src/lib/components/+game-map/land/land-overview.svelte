<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { openLandInfoWidget } from '$lib/components/+game-ui/game-ui.svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { moveCameraTo } from '$lib/stores/camera.store';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { cn, locationIntToString, parseLocation } from '$lib/utils';
  import { estimateNukeTime } from '$lib/utils/taxes';
  import { Search } from 'lucide-svelte';
  import { get } from 'svelte/store';
  import LandDisplay from './land-display.svelte';
  import LandLevelProgress from './land-level-progress.svelte';
  import LandNukeShield from './land-nuke-shield.svelte';

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
  let levelUpInfo = $derived(land.getLevelInfo());

  // Nuke time state (in seconds) - calculated automatically with $effect
  let estimatedNukeTime = $state<number | undefined>(undefined);
  let isUpdatingNukeTime = $state(false);

  // Automatically calculate nuke time when land changes
  $effect(() => {
    const calculateNukeTime = async () => {
      if (!land) {
        estimatedNukeTime = undefined;
        return;
      }

      isUpdatingNukeTime = true;
      try {
        const timeInSeconds = await estimateNukeTime(land);
        estimatedNukeTime = timeInSeconds;
      } catch (error) {
        console.warn(
          'Failed to calculate nuke time for land:',
          land.location,
          error,
        );
        estimatedNukeTime = undefined;
      } finally {
        isUpdatingNukeTime = false;
      }
    };
    calculateNukeTime();
  });

  // Update level info periodically
  $effect(() => {
    const interval = setInterval(() => {
      levelUpInfo = land.getLevelInfo();
    }, 5000);
    return () => clearInterval(interval);
  });

  function handleLandClick(land: LandWithActions) {
    moveCameraTo(
      parseLocation(land.location)[0] + 1,
      parseLocation(land.location)[1] + 1,
    );
    const coordinates = parseLocation(land.location);
    const baseLand = landStore.getLand(coordinates[0], coordinates[1]);
    if (baseLand) {
      selectedLand.value = get(baseLand);
    }
  }

  function handleOpenLandInfo(land: LandWithActions) {
    openLandInfoWidget(land);
  }
</script>

<div
  class={cn('flex flex-col justify-center items-center', {
    'w-48': size === 'lg',
    'w-24': size === 'sm',
    'w-16': size === 'xs',
  })}
>
  <button
    onclick={() => handleLandClick(land)}
    class={cn('flex items-center justify-center relative cursor-pointer', {
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
    <div class="absolute top-0 left-0 -m-1 leading-none">
      <span
        class={cn('text-ponzi', {
          'text-xl': size === 'lg',
          'text-sm': size === 'sm',
          'text-xs': size === 'xs',
        })}
      >
        {locationIntToString(land.location)}
      </span>
      {#if land.type == 'house'}
        <div
          class={cn('leading-none flex flex-col justify-center mt-1', {
            'gap-[0.5px]': size === 'xs',
            'gap-[1px]': size === 'sm',
            'gap-[2px]': size === 'lg',
          })}
        >
          {#each [1, 2, 3] as level}
            <div
              class={cn(
                'rounded-full border-2 border-black',
                {
                  'h-2 w-2': size === 'xs',
                  'h-3 w-3': size === 'sm',
                  'h-4 w-4': size === 'lg',
                },
                land.level >= level ? 'bg-blue-500' : 'bg-gray-800',
              )}
            ></div>
          {/each}
        </div>
      {/if}
      <!-- <span class={cn('opacity-50', { 'text-xs': size === 'xs' })}
        >#{new Number(land.location).toString()}</span
      > -->
    </div>

    <div class="absolute top-0 right-0 leading-none -mt-2 -m-1">
      <TokenAvatar
        token={land.token}
        class={cn('border-2 border-black', {
          'w-4 h-4': size === 'xs',
          'w-5 h-5': size === 'sm',
          'w-8 h-8': size === 'lg',
        })}
      />
    </div>

    <!-- Nuke Shield display -->
    {#if land.type === 'house'}
      <div class="absolute bottom-0 left-0 -mb-3 -ml-4 scale-90">
        {#if isUpdatingNukeTime}
          <div
            class={cn('flex items-center justify-center', {
              'h-8 w-8 text-xs': size === 'xs',
              'h-12 w-12 text-sm': size === 'sm',
              'h-16 w-16 text-lg': size === 'lg',
            })}
          >
            <RotatingCoin />
          </div>
        {:else if estimatedNukeTime !== undefined}
          <LandNukeShield
            {estimatedNukeTime}
            class={cn({
              'h-8 w-8 text-xs': size === 'xs',
              'h-12 w-12 text-sm': size === 'sm',
              'h-16 w-16 text-lg': size === 'lg',
            })}
            lockTime={false}
          />
        {/if}
      </div>
    {/if}

    <Button
      class="absolute bottom-0 right-0 -m-1 p-1"
      size="md"
      onclick={(e: any) => {
        e.stopPropagation();
        handleOpenLandInfo(land);
      }}
    >
      <Search size="small" strokeWidth={4} class="-mt-1 h-4 w-3" />
    </Button>
  </button>

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
