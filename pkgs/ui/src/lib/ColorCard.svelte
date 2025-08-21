<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import { clsx, type ClassValue } from 'clsx';
  import './ColorCard.css';
  import { buttonImages } from './assets/button-images-embedded.js';

  function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
  }

  type Variant = 'blue' | 'red';

  interface ColorCardProps extends HTMLAttributes<HTMLDivElement> {
    class?: string;
    children?: Snippet;
    variant?: Variant;
    defaultImage?: string;
    hoverImage?: string;
    disableHover?: boolean;
  }

  let {
    class: className,
    children,
    variant = 'blue',
    defaultImage: customDefaultImage,
    hoverImage: customHoverImage,
    disableHover = false,
    ...restProps
  }: ColorCardProps = $props();

  const cardClass = cn(
    'color-card',
    `color-card--${variant}`,
    disableHover && 'color-card--no-hover',
    className
  );

  const defaultImage = customDefaultImage || buttonImages[variant].default;
  const hoverImage = customHoverImage || buttonImages[variant].hover;
  const effectiveHoverImage = disableHover ? defaultImage : hoverImage;
</script>

<div
  class={cardClass}
  style="--button-default-image: url('{defaultImage}'); --button-hover-image: url('{effectiveHoverImage}');"
  {...restProps}
>
  {@render children?.()}
</div> 