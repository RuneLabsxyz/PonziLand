<script lang="ts">
  import { cn } from '$lib/utils/index.js';

  interface Props {
    class?: string;
    [key: string]: any;
  }

  let { class: className, ...restProps }: Props = $props();
</script>

<div class={cn('p-6', className)} {...restProps}>
  <slot />
</div>
