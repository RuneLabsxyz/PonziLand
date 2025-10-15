<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui-old';
  import { scale } from 'svelte/transition';
  import { cn, flyAndScale } from '$lib/utils.js';
  import { selectVariants, type SelectProps } from './select-variants.js';
  import { getContext } from 'svelte';

  type $$Props = SelectPrimitive.ContentProps & SelectProps;
  type $$Events = SelectPrimitive.ContentEvents;

  export let sideOffset: $$Props['sideOffset'] = 4;
  export let inTransition: $$Props['inTransition'] = flyAndScale;
  export let inTransitionConfig: $$Props['inTransitionConfig'] = undefined;
  export let outTransition: $$Props['outTransition'] = scale;
  export let outTransitionConfig: $$Props['outTransitionConfig'] = {
    start: 0.95,
    opacity: 0,
    duration: 50,
  };
  export let variant: $$Props['variant'] = undefined;

  let className: $$Props['class'] = undefined;
  export { className as class };

  // Get variant from context or use explicit prop or default
  const contextVariant = getContext<$$Props['variant']>('select-variant');
  $: finalVariant = variant ?? contextVariant ?? 'default';
  $: styles = selectVariants({ variant: finalVariant });
</script>

<SelectPrimitive.Content
  {inTransition}
  {inTransitionConfig}
  {outTransition}
  {outTransitionConfig}
  {sideOffset}
  class={cn(styles.content(), className)}
  {...$$restProps}
  on:keydown
>
  <div class="w-full">
    <slot />
  </div>
</SelectPrimitive.Content>
