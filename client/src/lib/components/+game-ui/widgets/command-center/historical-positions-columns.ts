import type { ColumnDef } from '@tanstack/table-core';
import type { HistoricalPosition } from './historical-positions.service';

export const columns: ColumnDef<HistoricalPosition>[] = [
  {
    accessorKey: 'land_location',
    header: 'Location',
    cell: ({ row }) => {
      const location = row.original.land_location;
      // Convert location to coordinates (will implement this)
      return `${location}`;
    },
  },
  {
    accessorKey: 'close_date',
    header: 'Status',
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = !position.close_date || position.close_date === null;
      return isOpen ? 'ALIVE' : position.close_reason?.toUpperCase() || 'CLOSED';
    },
  },
  {
    accessorKey: 'time_bought',
    header: 'Bought',
    cell: ({ row }) => {
      const position = row.original;
      const date = new Date(position.time_bought);
      const formatted = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const isAuction = position.buy_token_used === null;
      return `${formatted} ${isAuction ? '(auction)' : '(player)'}`;
    },
  },
  {
    accessorKey: 'close_date',
    header: 'Close',
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = !position.close_date || position.close_date === null;
      if (isOpen) return '-';
      const date = new Date(position.close_date);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
  },
  {
    accessorKey: 'buy_cost_token',
    header: 'Buy Cost',
    cell: ({ row }) => {
      const position = row.original;
      return position.buy_cost_token;
    },
  },
  {
    accessorKey: 'sale_revenue_token',
    header: 'Sold For',
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = !position.close_date || position.close_date === null;
      if (isOpen) return '-';
      return position.sale_revenue_token || '-';
    },
  },
  {
    id: 'net_flow',
    header: 'Net Flow',
    cell: ({ row }) => {
      // Will implement token flow calculation
      return '-';
    },
  },
  {
    id: 'sale_pnl',
    header: 'Sale P&L',
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = !position.close_date || position.close_date === null;
      if (isOpen) return 'TBD';
      // Will implement P&L calculation
      return '-';
    },
  },
  {
    id: 'total_pnl',
    header: 'P&L',
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = !position.close_date || position.close_date === null;
      if (isOpen) return 'TBD';
      // Will implement total P&L calculation with share button
      return '-';
    },
  },
];