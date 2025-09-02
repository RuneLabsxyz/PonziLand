<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Select as SelectPrimitive } from 'bits-ui-old';
  import { selectVariants, type SelectProps } from './select-variants.js';
  import { getContext } from 'svelte';

  type $$Props = SelectPrimitive.TriggerProps & SelectProps;
  type $$Events = SelectPrimitive.TriggerEvents;

  let className: $$Props['class'] = undefined;
  export let variant: $$Props['variant'] = undefined;
  export { className as class };

  // Get variant from context or use explicit prop or default
  const contextVariant = getContext<$$Props['variant']>('select-variant');
  $: finalVariant = variant ?? contextVariant ?? 'default';
  $: styles = selectVariants({ variant: finalVariant });
</script>

<SelectPrimitive.Trigger
  class={cn(styles.trigger(), className)}
  {...$$restProps}
  let:builder
  on:click
  on:keydown
>
  <slot {builder} />
  <div>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="21"
      height="11"
      viewBox="0 0 21 11"
      fill="none"
    >
      <g filter="url(#filter0_d_11_102)">
        <path
          d="M16.6301 1.50354L10.8199 6.173L5.00973 1.50354L16.6301 1.50354Z"
          fill="#D9D9D9"
          shape-rendering="crispEdges"
        />
        <path
          d="M2.96704 0.784791L4.55884 2.06409L10.3694 6.73303L10.8196 7.09534L11.2708 6.73303L17.0803 2.06409L18.6721 0.78479L2.96704 0.784791Z"
          stroke="black"
          stroke-opacity="0.35"
          stroke-width="1.43801"
          shape-rendering="crispEdges"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_11_102"
          x="0.924805"
          y="0.0655518"
          width="19.7903"
          height="10.8283"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="2.87602" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_11_102"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_11_102"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  </div>
</SelectPrimitive.Trigger>
