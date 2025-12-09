<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import type { SortDirection } from '@tanstack/table-core';

  type Props = ComponentProps<typeof Button> & {
    title: string;
    sortDirection?: false | SortDirection;
    onclick?: (event: unknown) => void;
  };

  let { title, sortDirection = false, onclick }: Props = $props();
</script>

<button class={['flex gap-1 items-center hover:opacity-75 group']} {onclick}>
  {title}
  {#if sortDirection === 'asc'}
    <ArrowUp class="h-3 w-3" />
  {:else if sortDirection === 'desc'}
    <ArrowDown class="h-3 w-3" />
  {:else}
    <ArrowUpDown class="h-3 w-3 opacity-0 group-hover:opacity-100" />
  {/if}
</button>
