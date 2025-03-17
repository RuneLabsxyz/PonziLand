<script lang="ts">
  import { cn } from '$lib/utils';
  import type { HTMLImgAttributes } from 'svelte/elements';

  let data: HTMLImgAttributes = $props();

  let loaded = $state(false);
</script>

<img
  {...data}
  onload={() => (loaded = true)}
  class={cn(data.class, {
    'opacity-0': !loaded,
    'opacity-100': loaded,
  })}
/>
