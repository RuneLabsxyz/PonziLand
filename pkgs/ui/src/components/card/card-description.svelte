<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/index.js';

  interface Props extends HTMLAttributes<HTMLParagraphElement> {}

  let { class: className, ...restProps }: Props = $props();
</script>

<p class={cn('text-muted-foreground ', className)} {...restProps}>
  <slot />
</p>
