<script lang="ts">
  import { cn } from '$lib/utils/index.js';
  import { Button } from 'bits-ui';
  import { type Props, buttonVariants } from './index.js';

  let {
    class: className = undefined,
    variant = 'blue',
    size = 'default',
    builders = [],
    onclick,
    onkeydown,
    ...restProps
  }: Props = $props();
</script>

<Button.Root
  {builders}
  class={cn(buttonVariants({ variant, size, className: className as any }))}
  type="button"
  {...restProps}
  {onclick}
  {onkeydown}
>
  <slot />
</Button.Root>
