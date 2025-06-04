<script lang="ts">
  import { Progress as ProgressPrimitive } from 'bits-ui-old';
  import { cn } from '$lib/utils.js';

  type $$Props = ProgressPrimitive.Props;

  let className: $$Props['class'] = undefined;
  export let max: $$Props['max'] = 100;
  export let value: $$Props['value'] = undefined;
  export let color: $$Props['color'] = '#F2B445';
  export { className as class };
</script>

<ProgressPrimitive.Root
  class={cn('p-1 relative h-4 w-full overflow-hidden', className)}
  {...$$restProps}
>
  <div
    class={cn('h-full w-full flex-1 transition-all', 'progress-bar-slanted')}
    style={`--p: ${(100 * (value ?? 0)) / (max ?? 1)}; --c: ${color};`}
  ></div>
</ProgressPrimitive.Root>

<style>
  .progress-bar-slanted {
    --s: 10px; /* define the curve (make bigger to increase the curve, smaller to reduce)*/
    --p: 50; /* percentage of the progress without unit */
    --c: #f2b445; /* color */

    background:
      linear-gradient(to bottom right, var(--c) 49%, transparent 50%)
        calc(1% * var(--p) + var(--p, 0) / 100 * var(--s)) 0 / var(--s) 100%,
      linear-gradient(var(--c) 0 0) 0 / calc(1% * var(--p)) 100%;
    background-repeat: no-repeat;
  }
</style>
