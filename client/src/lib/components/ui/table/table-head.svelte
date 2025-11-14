<script lang="ts">
  import type { HTMLThAttributes } from 'svelte/elements';
  import type { WithElementRef } from 'bits-ui';
  import { cn } from '$lib/utils.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLThAttributes> = $props();
</script>

<th
  bind:this={ref}
  class={cn(
    'px-4 py-2 text-left text-gray-400 select-none leading-none',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</th>
