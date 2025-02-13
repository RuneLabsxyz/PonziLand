<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import { cn } from '$lib/utils';

  let {
    class: className = '',
    token,
    grass = true,
    basic = false,
    auction = false,
  }: {
    class?: string;
    token?: Token;
    grass?: boolean;
    basic?: boolean;
    auction?: boolean;
  } = $props();
</script>

<div class={cn('h-full w-full relative', className)}>
  {#if grass}
    <div
      style="background-image: url('/assets/tiles/grass.png'); background-size: contain; background-position: center;"
      class="absolute h-full w-full top-0 bottom-0 left-0 right-0"
    ></div>
  {/if}
  {#if auction}
    <div
      style="background-image: url('/assets/tiles/auction.png'); background-size: contain; background-position: center;"
      class="absolute h-full w-full top-0 bottom-0 left-0 right-0"
    ></div>
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
