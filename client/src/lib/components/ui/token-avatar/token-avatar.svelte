<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import { cn, getTokenMetadata } from '$lib/utils';

  let { token = $bindable<Token>(), class: className = 'h-4 w-4' } = $props();
  const metadata = $derived(getTokenMetadata(token.skin));
</script>

<div class={cn('rounded-full', className)}>
  <img
    src={metadata?.icon || '/tokens/default/icon.png'}
    alt={token.symbol}
    class="pointer-events-none select-none"
  />
</div>
