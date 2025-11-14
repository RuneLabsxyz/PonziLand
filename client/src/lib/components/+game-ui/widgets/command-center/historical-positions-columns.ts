import type { ColumnDef } from '@tanstack/table-core';
import type { HistoricalPosition } from './historical-positions.service';

// Helper function to check if a position is open
function isPositionOpen(position: HistoricalPosition): boolean {
  return !position.close_date || position.close_date === null;
}

// Import the actual coordinate conversion utility
import { locationToCoordinates } from '$lib/utils';

// Helper function to format dates
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export const columns: ColumnDef<HistoricalPosition>[] = [
  {
    accessorKey: 'land_location',
    header: 'Location',
    enableSorting: true,
    sortingFn: 'alphanumeric',
    cell: ({ row }) => {
      const location = row.original.land_location;
      const coords = locationToCoordinates(location);
      return `<span class="text-gray-300 tracking-wide">${coords.x}, ${coords.y}</span>`;
    },
  },
  {
    accessorKey: 'close_date',
    header: 'Status',
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const aOpen = isPositionOpen(rowA.original);
      const bOpen = isPositionOpen(rowB.original);
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;
      return 0;
    },
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = isPositionOpen(position);

      if (isOpen) {
        return `
          <div class="flex gap-1 items-center font-ponzi-number text-xs tracking-wider">
            <img src="/ui/icons/IconTiny_Stats.png" alt="Alive" class="h-4 w-4" />
            <span class="text-green-400 font-semibold">ALIVE</span>
          </div>
        `;
      } else {
        const iconSrc =
          position.close_reason === 'nuked'
            ? '/ui/icons/Icon_Nuke.png'
            : '/ui/icons/Icon_Coin3.png';
        const colorClass =
          position.close_reason === 'nuked'
            ? 'text-red-400'
            : 'text-yellow-500';
        const label = position.close_reason === 'nuked' ? 'NUKED' : 'SOLD';

        return `
          <div class="flex gap-1 items-center font-ponzi-number text-xs tracking-wider">
            <img src="${iconSrc}" alt="${label}" class="h-4 w-4" />
            <span class="${colorClass}">${label}</span>
          </div>
        `;
      }
    },
  },
  {
    accessorKey: 'time_bought',
    header: 'Bought',
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({ row }) => {
      const position = row.original;
      const formatted = formatDate(position.time_bought);
      const isAuction = position.buy_token_used === null;
      const typeClass = isAuction ? 'text-blue-400' : 'text-purple-400';
      const typeLabel = isAuction ? '(auction)' : '(player)';

      return `
        <div class="flex text-gray-400">
          ${formatted}
          <span class="${typeClass} ml-1">${typeLabel}</span>
        </div>
      `;
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
      const formatted = formatDate(position.close_date);
      return `<span class="text-gray-400">${formatted}</span>`;
    },
  },
  {
    accessorKey: 'buy_cost_token',
    header: 'Buy Cost',
    enableSorting: true,
    sortingFn: 'alphanumeric',
    cell: ({ row }) => {
      const position = row.original;
      // For now, just display the raw value - will enhance with token formatting later
      return `
        <div class="text-right">
          <span class="text-white">${position.buy_cost_token}</span>
          <span class="text-gray-500 ml-1">ETH</span>
        </div>
      `;
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
      if (position.sale_revenue_token) {
        return `
          <div class="text-right">
            <span class="text-white">${position.sale_revenue_token}</span>
            <span class="text-gray-500 ml-1">ETH</span>
          </div>
        `;
      }
      return '<div class="text-right"><span class="text-gray-500">-</span></div>';
    },
  },
  {
    id: 'net_flow',
    header: 'Net Flow',
    cell: ({ row }) => {
      // Placeholder for now - will implement proper token flow calculation
      return '<div class="text-right"><span class="text-gray-500">-</span></div>';
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
      // Placeholder for now - will implement P&L calculation
      return '<div class="text-right"><span class="text-gray-500">-</span></div>';
    },
  },
  {
    id: 'total_pnl',
    header: 'P&L',
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = isPositionOpen(position);
      const displayText = isOpen ? 'TBD' : '-';

      return `
        <div class="text-right flex items-center justify-end gap-1">
          <span class="text-gray-500">${displayText}</span>
          ${
            !isOpen
              ? `
            <div class="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 cursor-pointer" 
                 onclick="sharePosition('${position.id}')" 
                 title="Share position">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16,6 12,2 8,6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </div>
          `
              : ''
          }
        </div>
      `;
    },
  },
];
