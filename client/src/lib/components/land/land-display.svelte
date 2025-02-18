<script lang="ts">
  import { landStore } from '$lib/api/mock-land';
  import type { Token } from '$lib/interfaces';
  import { cn } from '$lib/utils';
  import seedrandom from 'seedrandom';
  import SpriteSheet from '../ui/sprite-sheet.svelte';
  import 'seedrandom';

  let {
    class: className = '',
    token,
    grass = false,
    basic = false,
    auction = false,
    road = false,
    seed = '',
  }: {
    class?: string;
    token?: Token;
    grass?: boolean;
    basic?: boolean;
    auction?: boolean;
    road?: boolean;
    seed?: string;
  } = $props();

  let rng = seedrandom(seed);

  let grassNumber = Math.floor(rng() * 9);

  let grassX = grassNumber % 4;
  let grassY = Math.floor(grassNumber / 3);

  let width = $state();
  let height = $state();
</script>

<div
  class={cn('h-full w-full relative', className)}
  bind:clientHeight={height}
  bind:clientWidth={width}
>
  {#if road}
    <SpriteSheet
      src="/sheets/road.png"
      y={0}
      x={0}
      xSize={320}
      ySize={320}
      xMax={320}
      yMax={320}
      {width}
      {height}
      class="absolute h-full w-full top-0 bottom-0 left-0 right-0"
    />
  {/if}
  {#if grass}
    <SpriteSheet
      src="/sheets/empty.png"
      y={grassY}
      x={grassX}
      xSize={256}
      xMax={1024}
      ySize={256}
      yMax={768}
      {width}
      {height}
      class="absolute h-full w-full top-0 bottom-0 left-0 right-0"
    />
  {/if}
  {#if auction}
    <SpriteSheet
      src="/sheets/empty.png"
      x={3}
      y={2}
      xSize={256}
      xMax={1024}
      ySize={256}
      yMax={768}
      {width}
      {height}
      class="absolute h-full w-full top-0 bottom-0 left-0 right-0"
    />
  {/if}
  {#if token}
    <div
      style="background-image: url({token?.images.castle
        .basic}); background-size: contain; background-position: center;"
      class="absolute h-full w-full top-0 bottom-0 left-0 right-0"
    ></div>
  {:else if basic}
    <div
      style="background-image: url('/assets/tokens/basic/castles/basic.png'); background-size: contain; background-position: center;"
      class="absolute h-full w-full top-0 bottom-0 left-0 right-0"
    ></div>
  {/if}
</div>
