<script lang="ts">
  import { Button as ButtonPrimitive } from 'bits-ui-old';
  import { type Events, type Props, buttonVariants } from './index.js';
  import { cn } from '$lib/utils.js';
  import { click_sound } from '$lib/sfx.js';

  type $$Props = Props;
  type $$Events = Events;

  let className: $$Props['class'] = undefined;
  export let variant: $$Props['variant'] = 'blue';
  export let size: $$Props['size'] = 'default';
  export let builders: $$Props['builders'] = [];
  export { className as class };
</script>

<ButtonPrimitive.Root
  {builders}
  class={cn(buttonVariants({ variant, size, className }))}
  type="button"
  {...$$restProps}
  on:click={() => {
    click_sound.play();
  }}
  on:keydown
>
  <slot />
</ButtonPrimitive.Root>
