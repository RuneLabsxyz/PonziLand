<script lang="ts">
  import { cn } from '$lib/utils/index.js';

  interface Props {
    class?: string;
    [key: string]: any;
  }

  let { class: className, ...restProps }: Props = $props();
</script>

<p class={cn('text-muted-foreground ', className)} {...restProps}>
  <slot />
</p>
