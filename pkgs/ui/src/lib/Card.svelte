<script lang="ts">
  import type { HTMLAttributes, Snippet } from 'svelte';
  import { clsx, type ClassValue } from 'clsx';
  import './Card.css';
  import { cardImages } from './assets/card-images-embedded.js';

  function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
  }

  interface CardProps extends HTMLAttributes<HTMLDivElement> {
    class?: string;
    children?: Snippet;
    frameImage?: string;
    textureImage?: string;
  }

  let {
    class: className,
    children,
    frameImage: customFrameImage,
    textureImage: customTextureImage,
    ...restProps
  }: CardProps = $props();

  const cardClass = cn(
    'card',
    className
  );

  // Get the appropriate card images (use custom if provided)
  const frameImage = customFrameImage || cardImages.frame;
  const textureImage = customTextureImage || cardImages.texture;
</script>

<div
  class={cardClass}
  style="--card-frame-image: url('{frameImage}'); --card-texture-image: url('{textureImage}');"
  {...restProps}
>
  {@render children?.()}
</div>