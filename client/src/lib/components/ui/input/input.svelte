<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils.js';

  type Props = HTMLInputAttributes & {
    inputElement?: HTMLInputElement;
  };

  let {
    class: className = undefined,
    value = $bindable(),
    readonly = undefined,
    inputElement = $bindable<HTMLInputElement | undefined>(),
    ...restProps
  }: Props = $props();
</script>

<input
  bind:this={inputElement}
  class={cn(
    'text-white text-2xl bg-[#282835] ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded px-2 py-2 file:border-0 file:bg-transparent file: file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
  style="line-height: 3rem; "
  bind:value
  {readonly}
  {...restProps}
/>

<style>
  /* Chrome, Safari, Edge, Opera */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox */
  input[type='number'] {
    appearance: textfield;
    -moz-appearance: textfield;
  }
</style>
