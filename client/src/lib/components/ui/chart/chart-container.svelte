<script lang="ts">
  import type { ChartConfig } from './index.js';
  import { cn } from '$lib/utils.js';
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    config: ChartConfig;
    children: Snippet;
  }

  let { config, children, class: className, ...rest }: Props = $props();

  // Convert config to CSS variables string
  let cssVars = $derived(
    Object.entries(config)
      .map(([key, value]) => `--color-${key}: ${value.color}`)
      .join('; '),
  );
</script>

<div class={cn('w-full', className)} style={cssVars} {...rest}>
  {@render children()}
</div>
