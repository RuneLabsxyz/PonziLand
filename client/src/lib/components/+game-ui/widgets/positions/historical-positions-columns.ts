import type { ColumnDef } from '@tanstack/table-core';
import type { HistoricalPosition } from './historical-positions.service';

// Import cell components
import LocationCell from './cells/location-cell.svelte';
import StatusCell from './cells/status-cell.svelte';
import DateCell from './cells/date-cell.svelte';
import DurationCell from './cells/duration-cell.svelte';
import CostCell from './cells/cost-cell.svelte';
import NetFlowCell from './cells/net-flow-cell.svelte';
import SalePnlCell from './cells/sale-pnl-cell.svelte';
import TotalPnlCell from './cells/total-pnl-cell.svelte';
import ROICell from './cells/roi-cell.svelte';
import { renderComponent, renderSnippet } from '$lib/components/ui/data-table';

// Helper function to check if a position is open
function isPositionOpen(position: HistoricalPosition): boolean {
  return !position.close_date || position.close_date === null;
}

export const columns: ColumnDef<HistoricalPosition>[] = [
  {
    accessorKey: 'land_location',
    header: 'Location',
    enableSorting: true,
    sortingFn: 'alphanumeric',
    cell: ({ row }) => {
      const location = row.original.land_location;
      return renderComponent(LocationCell, { location: location.toString() });
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      // sort by close reason alphabetically
      const closeA = rowA.original.close_reason;
      const closeB = rowB.original.close_reason;
      return closeA.localeCompare(closeB);
    },
    cell: ({ row }) => {
      const position = row.original;
      return renderComponent(StatusCell, { position });
    },
  },
  {
    accessorKey: 'time_bought',
    header: 'Bought',
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({ row }) => {
      const position = row.original;
      return renderComponent(DateCell, {
        dateString: position.time_bought,
        buyTokenUsed: position.buy_token_used,
        variant: 'buy',
      });
    },
  },
  {
    accessorKey: 'close_date',
    header: 'Close',
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = isPositionOpen(position);
      if (isOpen) {
        return '<span class="text-gray-400">-</span>';
      }
      return renderComponent(DateCell, {
        dateString: position.close_date,
        variant: 'close',
        position: position,
      });
    },
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const posA = rowA.original;
      const posB = rowB.original;
      const endA = posA.close_date ? new Date(posA.close_date) : new Date();
      const endB = posB.close_date ? new Date(posB.close_date) : new Date();
      const durationA = endA.getTime() - new Date(posA.time_bought).getTime();
      const durationB = endB.getTime() - new Date(posB.time_bought).getTime();
      return durationA - durationB;
    },
    cell: ({ row }) => {
      const position = row.original;
      return renderComponent(DurationCell, { position });
    },
  },
  {
    accessorKey: 'buy_cost_token',
    header: 'Buy Cost',
    enableSorting: true,
    sortingFn: 'alphanumeric',
    cell: ({ row }) => {
      const position = row.original;
      return renderComponent(CostCell, {
        cost: position.buy_cost_token,
        tokenAddress: position.buy_token_used,
      });
    },
  },
  {
    accessorKey: 'sale_revenue_token',
    header: 'Sold For',
    enableSorting: true,
    sortingFn: 'alphanumeric',
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = isPositionOpen(position);
      if (isOpen) {
        return '<div class="text-right"><span class="text-gray-500">-</span></div>';
      }
      return renderComponent(CostCell, {
        cost: position.sale_revenue_token,
        tokenAddress: position.sale_token_used,
      });
    },
  },
  {
    id: 'net_flow',
    header: 'Net Flow',
    cell: ({ row }) => {
      const position = row.original;
      return renderComponent(NetFlowCell, { position });
    },
  },
  {
    id: 'sale_pnl',
    header: 'Sale P&L',
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = isPositionOpen(position);
      if (isOpen) {
        return '<div class="text-right"><span class="text-gray-500">TBD</span></div>';
      }
      return renderComponent(SalePnlCell, { position });
    },
  },
  {
    id: 'total_pnl',
    header: 'P&L',
    cell: ({ row }) => {
      const position = row.original;
      return renderComponent(TotalPnlCell, { position, showShareButton: true });
    },
  },
];
