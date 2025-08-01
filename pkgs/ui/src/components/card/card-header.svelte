<script lang="ts">
  import { cn } from '$lib/utils/index.js';

  interface Props {
    class?: string;
    [key: string]: any;
  }

  let { class: className, ...restProps }: Props = $props();
</script>

<div class={cn('flex flex-col space-y-1.5 p-6 pb-0', className)} {...restProps}>
  <slot />
</div>
