<script lang="ts">
  import type { Table } from '@tanstack/table-core';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import type { Snippet } from 'svelte';

  type Props<TData> = {
    table: Table<TData>;
    searchColumn?: string;
    searchPlaceholder?: string;
    customFilters?: Snippet<[]>;
    class?: string;
  };

  let {
    table,
    searchColumn,
    searchPlaceholder = 'Filter...',
    customFilters,
    class: className = '',
  }: Props<any> = $props();

  let searchValue = $state('');

  $effect(() => {
    if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue(searchValue);
    }
  });
</script>

<div class={['flex items-center justify-between py-4', className]}>
  <div class="flex items-center gap-4">
    <!-- Search input -->
    {#if searchColumn}
      <Input
        placeholder={searchPlaceholder}
        bind:value={searchValue}
        class="max-w-sm"
      />
    {/if}

    <!-- Custom filter controls -->
    {#if customFilters}
      {@render customFilters()}
    {/if}
  </div>
</div>
