<script lang="ts">
  import {
    createTable,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getExpandedRowModel,
    type ColumnDef,
    type SortingState,
    type FilterFn,
    type ExpandedState,
  } from '@tanstack/table-core';

  interface Props<T = any> {
    data: T[];
    columns: ColumnDef<T, any>[];
    globalFilter?: string;
    customFilter?: FilterFn<T>;
    expandedContent?: (row: T) => string;
  }

  type T = $$Generic;
  let {
    data,
    columns,
    globalFilter = '',
    customFilter,
    expandedContent,
  }: Props<T> = $props();

  let sorting = $state<SortingState>([]);
  let expanded = $state<ExpandedState>({});

  const table = $derived(
    createTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getExpandedRowModel: getExpandedRowModel(),
      state: {
        sorting,
        globalFilter,
        expanded,
      },
      onSortingChange: (updaterOrValue) => {
        if (typeof updaterOrValue === 'function') {
          sorting = updaterOrValue(sorting);
        } else {
          sorting = updaterOrValue;
        }
      },
      onExpandedChange: (updaterOrValue) => {
        if (typeof updaterOrValue === 'function') {
          expanded = updaterOrValue(expanded);
        } else {
          expanded = updaterOrValue;
        }
      },
      globalFilterFn: customFilter || 'includesString',
      getRowCanExpand: () => !!expandedContent,
    }),
  );
</script>

<div class="flex flex-col min-h-0">
  <div class="overflow-auto flex-1">
    <table class="w-full min-w-[1400px]">
      <thead>
        {#each table.getHeaderGroups() as headerGroup}
          <tr class="border-b border-gray-700">
            {#each headerGroup.headers as header}
              <th
                class="px-4 py-2 text-left text-xs text-gray-400 select-none"
                class:cursor-pointer={header.column.getCanSort()}
                class:hover:text-gray-200={header.column.getCanSort()}
                onclick={() =>
                  header.column.getCanSort()
                    ? header.column.toggleSorting()
                    : null}
              >
                {#if !header.isPlaceholder}
                  <div class="flex items-center gap-1">
                    {@html flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {#if header.column.getCanSort()}
                      <span class="text-xs opacity-60">
                        {#if header.column.getIsSorted() === 'desc'}
                          ▼
                        {:else if header.column.getIsSorted() === 'asc'}
                          ▲
                        {:else}
                          ⇅
                        {/if}
                      </span>
                    {/if}
                  </div>
                {/if}
              </th>
            {/each}
          </tr>
        {/each}
      </thead>
      <tbody>
        {#each table.getRowModel().rows as row}
          {@const isOpen =
            !row.original.close_date || row.original.close_date === null}
          {@const canExpand = row.getCanExpand()}
          <tr
            class="border-b border-gray-800/50 hover:bg-white/5 transition-colors relative {isOpen
              ? 'bg-green-900/10'
              : ''}"
            class:cursor-pointer={canExpand}
            onclick={() => (canExpand ? row.toggleExpanded() : null)}
          >
            {#if isOpen}
              <div
                class="absolute left-0 top-0 bottom-0 w-1 bg-green-400"
              ></div>
            {/if}
            {#each row.getVisibleCells() as cell, index}
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  {#if index === 0 && canExpand}
                    <span class="text-gray-500 text-xs">
                      {#if row.getIsExpanded()}
                        ▼
                      {:else}
                        ▶
                      {/if}
                    </span>
                  {/if}
                  <div>
                    {@html flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </div>
                </div>
              </td>
            {/each}
          </tr>
          {#if row.getIsExpanded() && expandedContent}
            <tr>
              <td colspan={columns.length} class="px-4 pb-4 bg-black/20">
                {@html expandedContent(row.original)}
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
</div>
