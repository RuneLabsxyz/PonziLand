<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar/index.js';
  import type { Token } from '$lib/interfaces';

  let { token = $bindable<Token>(), class: className = 'h-4 w-4' } = $props();
</script>

<Avatar.Root class={className}>
  <Avatar.Image
    src={token.images.icon}
    alt={token.symbol}
  />
  <Avatar.Fallback>{token.symbol}</Avatar.Fallback>
</Avatar.Root> 