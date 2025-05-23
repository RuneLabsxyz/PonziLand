<script lang="ts">
  import Check from 'lucide-svelte/icons/check';
  import { Select as SelectPrimitive } from 'bits-ui-old';
  import { cn } from '$lib/utils.js';

  type $$Props = SelectPrimitive.ItemProps;
  type $$Events = SelectPrimitive.ItemEvents;

  let className: $$Props['class'] = undefined;
  export let value: $$Props['value'];
  export let label: $$Props['label'] = undefined;
  export let disabled: $$Props['disabled'] = undefined;
  export { className as class };
</script>

<SelectPrimitive.Item
  {value}
  {disabled}
  {label}
  class={cn(
    'text-black data-[highlighted]:bg-primary data-[highlighted]:text-accent-foreground relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2  outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    className,
  )}
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
