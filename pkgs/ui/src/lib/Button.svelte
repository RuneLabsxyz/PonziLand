<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { clsx, type ClassValue } from 'clsx';
  import './Button.css';
  import { buttonImages } from './assets/button-images-embedded.js';
  import { fontStyles } from './assets/fonts-embedded.js';

  function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
  }

  type Variant = 'blue' | 'red';
  type Size = 'default' | 'grid' | 'sm' | 'md' | 'lg' | 'icon';

  interface ButtonProps extends HTMLButtonAttributes {
    variant?: Variant;
    size?: Size;
    class?: string;
    defaultImage?: string;
    hoverImage?: string;
  }

  let { 
    variant = 'blue',
    size = 'default',
    type = 'button',
    disabled = false,
    class: className,
    onclick,
    defaultImage: customDefaultImage,
    hoverImage: customHoverImage,
    ...restProps
  }: ButtonProps = $props();

  const buttonClass = cn(
    'button',
    `button--${variant}`,
    `button--${size}`,
    className
  );

  // Get the appropriate button images (use custom if provided)
  const defaultImage = customDefaultImage || buttonImages[variant].default;
  const hoverImage = customHoverImage || buttonImages[variant].hover;
</script>

<!-- Include font styles -->
<svelte:head>
  {@html `<style>${fontStyles}</style>`}
</svelte:head>

<button
  {type}
  {disabled}
  class={buttonClass}
  {onclick}
  style="--button-default-image: url('{defaultImage}'); --button-hover-image: url('{hoverImage}');"
  {...restProps}
>
  <slot />
</button>