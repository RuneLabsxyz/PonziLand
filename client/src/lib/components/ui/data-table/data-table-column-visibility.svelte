<script lang="ts">
  import type { Table } from '@tanstack/table-core';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Settings2 } from '@lucide/svelte';

  type Props<TData> = {
    table: Table<TData>;
    triggerClass?: string;
  };

  let { table, triggerClass = 'ms-auto' }: Props<any> = $props();

  function handleToggle(column: any) {
    column.toggleVisibility();
    // Force a reactivity update by accessing the table state
    table.getState();
  }
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <button
      class={[
        'border-blue-50 border flex items-center p-1 gap-1 text-xs',
        triggerClass,
      ]}
    >
      <Settings2 class="h-4 w-4" />
      Columns
    </button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-48 bg-ponzi">
    <DropdownMenu.Label>Toggle columns</DropdownMenu.Label>
    <DropdownMenu.Separator />
    {#each table
      .getAllColumns()
      .filter((col) => col.getCanHide()) as column (column.id)}
      <DropdownMenu.CheckboxItem
        class="capitalize text-white"
        checked={column.getIsVisible()}
        onCheckedChange={() => handleToggle(column)}
        onclick={(event) => {
          event.stopPropagation();
        }}
      >
        {column.id.replace(/_/g, ' ')}
      </DropdownMenu.CheckboxItem>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
