<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui-old';
  import { cn } from '$lib/utils.js';

  type $$Props = SelectPrimitive.LabelProps;

  let className: $$Props['class'] = undefined;
  export { className as class };
</script>

<SelectPrimitive.Label
  class={cn('py-1.5 pl-8 pr-2  font-semibold', className)}
  {...$$restProps}
>
  <slot />
</SelectPrimitive.Label>
