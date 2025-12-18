<script lang="ts">
  import { cn } from '$lib/utils.js';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    indicator?: 'dot' | 'line' | 'dashed';
    children?: Snippet;
  }

  let {
    indicator = 'dot',
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<div
  class={cn(
    'rounded-lg border bg-background px-3 py-2 text-sm shadow-md',
    className,
  )}
  {...rest}
>
  {#if children}
    {@render children()}
  {/if}
</div>
