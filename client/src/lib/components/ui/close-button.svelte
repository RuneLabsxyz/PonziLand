<script lang="ts">
  import { cn } from '$lib/utils.js';
  import type { MouseEventHandler } from 'svelte/elements';

  const { className = '', onclick } = $props<{
    className?: string;
    onclick: MouseEventHandler<HTMLButtonElement>;
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
  <img src="/assets/ui/icons/Icon_Thin_WindowClose.png" alt="close" />
</button>
