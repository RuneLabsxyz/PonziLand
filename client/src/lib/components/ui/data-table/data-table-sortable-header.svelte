<script lang="ts">
  import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    EyeOff,
    Eye,
    ChevronDown,
  } from '@lucide/svelte';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import type { SortDirection } from '@tanstack/table-core';

  type Props = {
    title: string;
    sortDirection?: false | SortDirection;
    onToggleVisibility?: () => void;
    isVisible?: boolean;
    onSort?: (direction: SortDirection | false) => void;
    enableSorting?: boolean;
  };

  let {
    title,
    sortDirection = false,
    onToggleVisibility,
    isVisible = true,
    onSort,
    enableSorting = true,
  }: Props = $props();

  function handleToggleVisibility(event: MouseEvent) {
    event.stopPropagation();
    if (onToggleVisibility) {
      onToggleVisibility();
    }
  }

  function handleSortDirection(direction: SortDirection | false) {
    if (onSort) {
      onSort(direction);
    }
  }
</script>

<!-- Dropdown menu for visibility toggle -->
<DropdownMenu.Root>
  <DropdownMenu.Trigger class="w-full group">
    <button
      class="w-full flex items-center"
      onclick={(e) => e.stopPropagation()}
    >
      {title}
      {#if sortDirection === 'asc'}
        <ArrowUp class="h-3 w-3" />
      {:else if sortDirection === 'desc'}
        <ArrowDown class="h-3 w-3" />
      {:else}
        <ChevronDown class="h-3 w-3 opacity-0 group-hover:opacity-100" />
      {/if}
    </button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-40 bg-ponzi">
    <!-- Sorting options -->
    {#if enableSorting}
      <DropdownMenu.Label class="text-gray-300">Sort</DropdownMenu.Label>
      <DropdownMenu.Item
        class="text-white flex items-center gap-2"
        onclick={() => handleSortDirection('asc')}
      >
        <ArrowUp class="h-3 w-3" />
        Ascending
        {#if sortDirection === 'asc'}
          <span class="ml-auto text-xs opacity-75">●</span>
        {/if}
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="text-white flex items-center gap-2"
        onclick={() => handleSortDirection('desc')}
      >
        <ArrowDown class="h-3 w-3" />
        Descending
        {#if sortDirection === 'desc'}
          <span class="ml-auto text-xs opacity-75">●</span>
        {/if}
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="text-white flex items-center gap-2"
        onclick={() => handleSortDirection(false)}
      >
        <ArrowUpDown class="h-3 w-3" />
        No Sort
        {#if !sortDirection}
          <span class="ml-auto text-xs opacity-75">●</span>
        {/if}
      </DropdownMenu.Item>
      <DropdownMenu.Separator />
    {/if}

    <!-- Visibility option -->
    {#if onToggleVisibility}
      <DropdownMenu.Item
        class="text-white flex items-center gap-2"
        onclick={handleToggleVisibility}
      >
        {#if isVisible}
          <EyeOff class="h-3 w-3" />
          Hide Column
        {:else}
          <Eye class="h-3 w-3" />
          Show Column
        {/if}
      </DropdownMenu.Item>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
