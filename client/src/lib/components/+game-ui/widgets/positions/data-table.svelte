<script lang="ts" generics="TData, TValue">
  import {
    type ColumnDef,
    type ColumnFiltersState,
    type VisibilityState,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    type SortingState,
  } from '@tanstack/table-core';
  import {
    createSvelteTable,
    FlexRender,
  } from '$lib/components/ui/data-table/index.js';
  import * as Table from '$lib/components/ui/table/index';
  import type { Snippet } from 'svelte';

  type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    columnFilters?: ColumnFiltersState;
    onColumnFiltersChange?: (
      updater:
        | ColumnFiltersState
        | ((old: ColumnFiltersState) => ColumnFiltersState),
    ) => void;
    columnVisibility?: VisibilityState;
    onColumnVisibilityChange?: (
      updater: VisibilityState | ((old: VisibilityState) => VisibilityState),
    ) => void;
    toolbar?: Snippet<[table: any]>;
    children?: Snippet<[table: any]>;
  };

  let {
    data,
    columns,
    columnFilters = $bindable([]),
    onColumnFiltersChange,
    columnVisibility = $bindable({}),
    onColumnVisibilityChange,
    toolbar,
    children,
  }: DataTableProps<TData, TValue> = $props();

  let sorting = $state<SortingState>([]);

  const table = createSvelteTable({
    get data() {
      return data;
    },
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: (updater) => {
      if (typeof updater === 'function') {
        columnFilters = updater(columnFilters);
      } else {
        columnFilters = updater;
      }
      if (onColumnFiltersChange) {
        onColumnFiltersChange(columnFilters);
      }
    },
    onColumnVisibilityChange: (updater) => {
      if (typeof updater === 'function') {
        columnVisibility = updater(columnVisibility);
      } else {
        columnVisibility = updater;
      }
      if (onColumnVisibilityChange) {
        onColumnVisibilityChange(columnVisibility);
      }
    },
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        sorting = updater(sorting);
      } else {
        sorting = updater;
      }
    },
    state: {
      get columnFilters() {
        return columnFilters;
      },
      get sorting() {
        return sorting;
      },
      get columnVisibility() {
        return columnVisibility;
      },
    },
  });
</script>

{#if toolbar}
  {@render toolbar(table)}
{/if}

{#if children}
  {@render children(table)}
{/if}

<Table.Root>
  <Table.Header class="sticky top-0 z-10 bg-black">
    {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
      {#each headerGroup.headers as header (header.id)}
        <Table.Head colspan={header.colSpan}>
          {#if !header.isPlaceholder}
            <FlexRender
              content={header.column.columnDef.header}
              context={header.getContext()}
            />
          {/if}
        </Table.Head>
      {/each}
    {/each}
  </Table.Header>
  <!-- DIVIDER ROW -->
  <Table.Row />
  <Table.Body>
    {#each table.getRowModel().rows as row (row.id)}
      <Table.Row data-state={row.getIsSelected() && 'selected'}>
        {#each row.getVisibleCells() as cell (cell.id)}
          <Table.Cell>
            <FlexRender
              content={cell.column.columnDef.cell}
              context={cell.getContext()}
            />
          </Table.Cell>
        {/each}
      </Table.Row>
    {:else}
      <Table.Row>
        <Table.Cell colspan={columns.length} class="h-24 text-center">
          No results.
        </Table.Cell>
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>
