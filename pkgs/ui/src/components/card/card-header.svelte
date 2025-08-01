<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/index.js';

  interface Props extends HTMLAttributes<HTMLDivElement> {}

  let { class: className, ...restProps }: Props = $props();
</script>

<div class={cn('flex flex-col space-y-1.5 p-6 pb-0', className)} {...restProps}>
  <slot />
</div>
