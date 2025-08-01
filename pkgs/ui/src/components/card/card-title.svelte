<script lang="ts">
  import type { HeadingLevel } from './index.js';
  import { cn } from '$lib/utils/index.js';

  interface Props {
    class?: string;
    tag?: HeadingLevel;
    [key: string]: any;
  }

  let { class: className, tag = 'h3', ...restProps }: Props = $props();
</script>

<svelte:element
  this={tag}
  class={cn('text-lg font-semibold leading-none tracking-tight', className)}
  {...restProps}
>
  <slot />
</svelte:element>
