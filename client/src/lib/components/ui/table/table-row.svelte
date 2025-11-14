<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { WithElementRef } from 'bits-ui';
  import { cn } from '$lib/utils.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props();
</script>

<tr
  bind:this={ref}
  class={cn(
    'border-b border-gray-800/50 hover:bg-white/5 transition-colors',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</tr>
