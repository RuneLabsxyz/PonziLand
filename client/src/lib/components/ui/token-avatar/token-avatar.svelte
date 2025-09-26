<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import type { Token } from '$lib/interfaces';
  import { getTokenMetadata } from '$lib/utils';

  let { token = $bindable<Token>(), class: className = 'h-4 w-4' } = $props();
</script>

<Avatar.Root class={className}>
  {@const metadata = getTokenMetadata(token.skin)}
  <Avatar.Image
    src={metadata?.icon || '/tokens/default/icon.png'}
    alt={token.symbol}
    class="pointer-events-none select-none"
  />
  <Avatar.Fallback>{token.symbol}</Avatar.Fallback>
</Avatar.Root>
