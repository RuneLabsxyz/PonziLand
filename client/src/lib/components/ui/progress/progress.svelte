<script lang="ts">
  import { Progress as ProgressPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils.js';

  type $$Props = ProgressPrimitive.Props;

  let className: $$Props['class'] = undefined;
  export let max: $$Props['max'] = 100;
  export let value: $$Props['value'] = undefined;
  export let color: $$Props['color'] = '#f1b335';
  export { className as class };
</script>

<ProgressPrimitive.Root
  class={cn('p-1 relative h-4 w-full overflow-hidden', className)}
  {...$$restProps}
>
  <div
    class={cn('h-full w-full flex-1 transition-all')}
    style={`transform: translateX(-${100 - (100 * (value ?? 0)) / (max ?? 1)}%); background-color: ${color};`}
  ></div>
</ProgressPrimitive.Root>
