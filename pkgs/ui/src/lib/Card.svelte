<script lang="ts">
  import type { HTMLAttributes, Snippet } from 'svelte';
  import { clsx, type ClassValue } from 'clsx';
  import './Card.css';

  function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
  }

  interface CardProps extends HTMLAttributes<HTMLDivElement> {
    class?: string;
    children?: Snippet;
  }

  let {
    class: className,
    children,
    ...restProps
  }: CardProps = $props();

  const cardClass = cn(
    'card',
    className
  );
</script>

<div
  class={cardClass}
  {...restProps}
>
  {@render children?.()}
</div>