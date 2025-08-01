<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/index.js';

  interface Props extends HTMLAttributes<HTMLDivElement> {}

  let { class: className, ...restProps }: Props = $props();
</script>

<div
  class={cn('bg-card text-card-foreground border-ponzi shadow-sm relative', className)}
  {...restProps}
>
  <slot />
</div>
