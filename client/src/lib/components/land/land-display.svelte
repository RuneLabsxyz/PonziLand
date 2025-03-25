<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import { cn } from '$lib/utils';
  import 'seedrandom';
  import seedrandom from 'seedrandom';
  import SpriteSheet from '../ui/sprite-sheet.svelte';
  import type { Level } from '$lib/api/land.svelte';

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
      src="/land-display/empty.png"
      x={3}
      y={2}
      xSize={256}
      xMax={1024}
      ySize={256}
      yMax={768}
      {width}
      {height}
      class={cn('absolute h-full w-full top-0 bottom-0 left-0 right-0', {
        selected: selected,
        hovering: hovering,
      })}
    />
  {/if}
  {#if token}
    <SpriteSheet
      src="/tokens/+global/biomes.png"
      x={token.images.biome.x}
      y={token.images.biome.y}
      xSize={256}
      xMax={2048}
      ySize={256}
      yMax={3328}
      {width}
      {height}
      class="Biome absolute h-full w-full top-0 bottom-0 left-0 right-0 {selected
        ? 'selected'
        : ''} {hovering ? 'hovering' : ''}"
    />
    {#if token.images.building[level].frames}
      {@const animationMeta = token.images.building[level]}
      <SpriteSheet
        src={`/tokens/${token.symbol}/${level}-animated.png`}
        xSize={animationMeta.xSize}
        ySize={animationMeta.ySize}
        xMax={animationMeta.xMax}
        yMax={animationMeta.yMax}
        {width}
        {height}
        animate={true}
        frameDelay={100}
        startFrame={0}
        endFrame={animationMeta.frames - 1}
        loop={true}
        boomerang={animationMeta.boomerang}
        horizontal={true}
        autoplay={true}
        delay={animationMeta.delay}
        class="absolute h-full w-full top-0 bottom-0 left-0 right-0 -translate-y-[3px] scale-75 {selected
          ? 'selected'
          : ''} {hovering ? 'hovering' : ''}"
      />
    {:else}
      <SpriteSheet
        src="/tokens/+global/buildings.png"
        x={token.images.building[level].x}
        y={token.images.building[level].y}
        xSize={256}
        xMax={1536}
        ySize={256}
        yMax={4608}
        {width}
        {height}
        class="absolute h-full w-full top-0 bottom-0 left-0 right-0 -translate-y-[3px] {selected
          ? 'selected'
          : ''} {hovering ? 'hovering' : ''}"
      />
    {/if}
  {:else if basic}
    <div
      style="background-image: url('/tokens/basic/castles/basic.png'); background-size: contain; background-position: center;"
      class="absolute h-full w-full top-0 bottom-0 left-0 right-0"
    ></div>
  {/if}
</div>
