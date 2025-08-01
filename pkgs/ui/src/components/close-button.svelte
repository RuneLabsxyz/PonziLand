<script lang="ts">
  import { cn } from '$lib/utils/index.js';
  import type { MouseEventHandler } from 'svelte/elements';

  const {
    className = '',
    onclick,
    iconSrc = '/ui/icons/Icon_Thin_WindowClose.png',
  } = $props<{
    className?: string;
    onclick: MouseEventHandler<HTMLButtonElement>;
    iconSrc?: string;
  }>();
</script>

<button
  class={cn`
    ${className}
    w-6
    h-6
    cursor-pointer
    absolute 
    top-0
    right-0
    m-2
    `}
  {onclick}
>
  <img src={iconSrc} alt="close" />
</button>
