<script lang="ts">
  import {
    createTable,
    getCoreRowModel,
    getExpandedRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    type ColumnDef,
    type ExpandedState,
    type FilterFn,
    type SortingState,
  } from '@tanstack/table-core';

  interface Props<T = any> {
    data: T[];
    columns: ColumnDef<T, any>[];
    globalFilter?: string;
    customFilter?: FilterFn<T>;
    expandedContent?: (row: T) => string | { component: any; props: any };
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

  // State updater functions that can be called from table callbacks
  function setSorting(updaterOrValue: any) {
    if (typeof updaterOrValue === 'function') {
      sorting = updaterOrValue(sorting);
    } else {
      sorting = updaterOrValue;
    }
  }

  function setExpanded(updaterOrValue: any) {
    if (typeof updaterOrValue === 'function') {
      expanded = updaterOrValue(expanded);
    } else {
      expanded = updaterOrValue;
    }
  }

  // Create table as a derived value with pure callback references
  const table = $derived.by(() => {
    const table = createTable({
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
        columnPinning: {
          left: [],
          right: [],
        },
      },
      onSortingChange: setSorting,
      onExpandedChange: setExpanded,
      globalFilterFn: customFilter || 'includesString',
      getRowCanExpand: () => !!expandedContent,
      renderFallbackValue: '',
      onStateChange: () => {},
    });
    console.log('Recreating table instance', table);
    return table;
  });

  // Helper to render component content
  function getComponentContent(definition: any, context: any) {
    if (typeof definition === 'function') {
      const result = definition(context);
      // If it's a component result, return it as-is
      if (result && typeof result === 'object' && result.component) {
        return result;
      }
      // Otherwise treat as HTML string
      return { html: result };
    }
    return { html: definition };
  }
</script>

<div class="flex flex-col min-h-0">
  <div class="overflow-auto flex-1">
    {#if data && data.length > 0 && table}
      <table class="w-full min-w-[1400px]">
        <thead class="sticky top-0 z-10">
          {#each table.getHeaderGroups() as headerGroup}
            <tr class="border-b border-gray-500/50">
              {#each headerGroup.headers as header}
                <th
                  class="px-4 py-2 text-left text-gray-400 select-none leading-none"
                  class:cursor-pointer={header.column.getCanSort()}
                  class:hover:text-gray-200={header.column.getCanSort()}
                  onclick={() =>
                    header.column.getCanSort()
                      ? header.column.toggleSorting()
                      : null}
                >
                  {#if !header.isPlaceholder}
                    {@const headerContent = getComponentContent(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    <div class="flex items-center gap-1">
                      {#if headerContent.component}
                        <headerContent.component {...headerContent.props} />
                      {:else}
                        {@html headerContent.html}
                      {/if}
                      {#if header.column.getCanSort()}
                        <span class="opacity-60 text-xs leading-none">
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
              !(row.original as any).close_date ||
              (row.original as any).close_date === null}
            {@const canExpand = row.getCanExpand()}
            <tr
              class="border-b border-gray-800/50 hover:bg-white/5 transition-colors {isOpen
                ? 'bg-green-900/10 border-l-2 border-l-green-400'
                : ''}"
              class:cursor-pointer={canExpand}
              onclick={() => (canExpand ? row.toggleExpanded() : null)}
            >
              {#each row.getVisibleCells() as cell, index}
                {@const cellContent = getComponentContent(
                  cell.column.columnDef.cell,
                  cell.getContext(),
                )}
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
                      {#if cellContent.component}
                        <cellContent.component {...cellContent.props} />
                      {:else}
                        {@html cellContent.html}
                      {/if}
                    </div>
                  </div>
                </td>
              {/each}
            </tr>
            {#if row.getIsExpanded() && expandedContent}
              {@const expandedResult = expandedContent(row.original)}
              <tr>
                <td colspan={columns.length} class="px-4 pb-4 bg-black/20">
                  {#if typeof expandedResult === 'object' && expandedResult && expandedResult.component}
                    <expandedResult.component {...expandedResult.props} />
                  {:else}
                    {@html expandedResult}
                  {/if}
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    {:else}
      <div class="text-center py-8 text-gray-400">No data available</div>
    {/if}
  </div>
</div>
