<script lang="ts">
  import {
    createTable,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    type ColumnDef,
    type SortingState,
    type FilterFn,
  } from '@tanstack/table-core';

  interface Props<T> {
    data: T[];
    columns: ColumnDef<T, any>[];
    globalFilter?: string;
    customFilter?: FilterFn<T>;
  }

  type T = $$Generic;
  let { data, columns, globalFilter = '', customFilter }: Props<T> = $props();

  let sorting = $state<SortingState>([]);

  const table = $derived(
    createTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      state: {
        sorting,
        globalFilter,
      },
      onSortingChange: (updaterOrValue) => {
        if (typeof updaterOrValue === 'function') {
          sorting = updaterOrValue(sorting);
        } else {
          sorting = updaterOrValue;
        }
      },
      globalFilterFn: customFilter || 'includesString',
    })
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
                class="px-4 py-2 text-left text-xs text-gray-400 cursor-pointer hover:text-gray-200"
                class:cursor-pointer={header.column.getCanSort()}
                onclick={() => header.column.getToggleSortingHandler()?.({})}
              >
                {#if !header.isPlaceholder}
                  <div class="flex items-center gap-2">
                    {@html flexRender(header.column.columnDef.header, header.getContext())}
                    {#if header.column.getIsSorted()}
                      <span class="text-xs">
                        {header.column.getIsSorted() === 'desc' ? '↓' : '↑'}
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
          <tr class="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
            {#each row.getVisibleCells() as cell}
              <td class="px-4 py-3">
                {@html flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>