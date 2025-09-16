<script lang="ts">
  import SpriteSheet from '$lib/components/ui/sprite-sheet.svelte';
  import type { Token } from '$lib/interfaces';
  import { cn, getTokenMetadata } from '$lib/utils';
  import type { Level } from '$lib/utils/level';
  import 'seedrandom';
  import seedrandom from 'seedrandom';

  let {
    class: className = '',
    token,
    grass = false,
    basic = false,
    auction = false,
    road = false,
    seed = '',
    level = 1,
    selected = false,
    hovering = false,
    highlighted = false,
  }: {
    class?: string;
    token?: Token;
    grass?: boolean;
    basic?: boolean;
    auction?: boolean;
    road?: boolean;
    seed?: string;
    level?: Level;
    selected?: boolean;
    hovering?: boolean;
    highlighted?: boolean;
  } = $props();

  let rng = $derived(seedrandom(seed));

  let grassNumber = $derived(Math.floor(rng() * 7));

  let grassX = $derived(grassNumber % 4);
  let grassY = $derived(Math.floor(grassNumber / 3));

  let width: number | undefined = $state();
  let height: number | undefined = $state();
</script>

<div
  class={cn('h-full w-full relative', className)}
  bind:clientHeight={height}
  bind:clientWidth={width}
>
  {#if road}
    <SpriteSheet
      src="/land-display/road.png"
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
      src="/land-display/empty.png"
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
      src="/land-display/auction-idle.png"
      xSize={256}
      xMax={1280}
      ySize={256}
      yMax={512}
      {width}
      {height}
      class={cn('Biome absolute h-full w-full top-0 bottom-0 left-0 right-0', {
        selected: selected,
        hovering: hovering,
        highlighted: highlighted,
      })}
      animate={true}
      frameDelay={100}
      startFrame={0}
      endFrame={9}
      loop={true}
      horizontal={true}
      autoplay={true}
    />
  {/if}
  {#if token}
    {#await getTokenMetadata(token.skin)}
      <!-- Loading state - show basic placeholder -->
      <div class="absolute h-full w-full top-0 bottom-0 left-0 right-0 bg-gray-400 animate-pulse rounded"></div>
    {:then metadata}
      {#if metadata}
        <!-- Biome Shadow -->
        <SpriteSheet
          src="/tokens/+global/biomes-shadow.png"
          x={metadata.biome.x}
          y={metadata.biome.y}
          xSize={256}
          xMax={2048}
          ySize={256}
          yMax={3328}
          {width}
          {height}
          class="Biome absolute h-full w-full top-0 bottom-0 left-0 right-0"
        />
        <!-- Main Biome -->
        <SpriteSheet
          src="/tokens/+global/biomes.png"
          x={metadata.biome.x}
          y={metadata.biome.y}
          xSize={256}
          xMax={1024}
          ySize={256}
          yMax={1280}
          {width}
          {height}
          class="Biome absolute h-full w-full top-0 bottom-0 left-0 right-0 {selected
            ? 'selected'
            : ''} {hovering ? 'hovering' : ''} {highlighted ? 'highlighted' : ''}"
        />
        <SpriteSheet
          src="/tokens/+global/buildings.png"
          x={metadata.building[level].x}
          y={metadata.building[level].y}
          xSize={256}
          xMax={3072}
          ySize={256}
          yMax={5376}
          {width}
          {height}
          class="absolute h-full w-full top-0 bottom-0 left-0 right-0 {selected
            ? 'selected'
            : ''} {hovering ? 'hovering' : ''} {highlighted ? 'highlighted' : ''}"
        />
      {/if}
    {:catch}
      <!-- Error state - show fallback -->
      <div class="absolute h-full w-full top-0 bottom-0 left-0 right-0 bg-gray-600 rounded"></div>
    {/await}
  {:else if basic}
    <div
      style="background-image: url('/tokens/basic/1.png'); background-size: contain; background-position: center;"
      class="absolute h-full w-full top-0 bottom-0 left-0 right-0"
    ></div>
  {/if}
</div>
