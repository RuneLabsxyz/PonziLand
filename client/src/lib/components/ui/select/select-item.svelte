<script lang="ts">
  import Check from 'lucide-svelte/icons/check';
  import { Select as SelectPrimitive } from 'bits-ui-old';
  import { cn } from '$lib/utils.js';
  import { selectVariants, type SelectProps } from './select-variants.js';
  import { getContext } from 'svelte';

  type $$Props = SelectPrimitive.ItemProps & SelectProps;
  type $$Events = SelectPrimitive.ItemEvents;

  let className: $$Props['class'] = undefined;
  export let value: $$Props['value'];
  export let label: $$Props['label'] = undefined;
  export let disabled: $$Props['disabled'] = undefined;
  export let variant: $$Props['variant'] = undefined;
  export { className as class };

  // Get variant from context or use explicit prop or default
  const contextVariant = getContext<$$Props['variant']>('select-variant');
  $: finalVariant = variant ?? contextVariant ?? 'default';
  $: styles = selectVariants({ variant: finalVariant });
</script>

<SelectPrimitive.Item
  {value}
  {disabled}
  {label}
  class={cn(styles.item(), className)}
  {...$$restProps}
  on:click
  on:keydown
  on:focusin
  on:focusout
  on:pointerleave
  on:pointermove
>
  <slot>
    {label || value}
  </slot>
</SelectPrimitive.Item>
