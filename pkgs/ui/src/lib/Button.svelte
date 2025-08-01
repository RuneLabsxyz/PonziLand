<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { clsx, type ClassValue } from 'clsx';
  import './Button.css';

  function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
  }

  type Variant = 'blue' | 'red';
  type Size = 'default' | 'grid' | 'sm' | 'md' | 'lg' | 'icon';

  interface ButtonProps extends HTMLButtonAttributes {
    variant?: Variant;
    size?: Size;
    class?: string;
  }

  let { 
    variant = 'blue',
    size = 'default',
    type = 'button',
    disabled = false,
    class: className,
    onclick,
    ...restProps
  }: ButtonProps = $props();

  const buttonClass = cn(
    'button',
    `button--${variant}`,
    `button--${size}`,
    className
  );
</script>

<button
  {type}
  {disabled}
  class={buttonClass}
  {onclick}
  {...restProps}
>
  <slot />
</button>