import {
  getBaseToken,
  originalBaseToken,
  walletStore,
} from '$lib/stores/wallet.svelte';
import { getTokenInfo } from '$lib/utils';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import type { ColumnDef, FilterFn } from '@tanstack/table-core';
import type { HistoricalPosition } from './historical-positions.service';
import { calculatePositionMetrics } from './position-pnl-calculator';

// Import cell components
import { renderComponent } from '$lib/components/ui/data-table';
import CostCell from './cells/cost-cell.svelte';
import DateCell from './cells/date-cell.svelte';
import DurationCell from './cells/duration-cell.svelte';
import LocationCell from './cells/location-cell.svelte';
import NetFlowCell from './cells/net-flow-cell.svelte';
import SalePnlCell from './cells/sale-pnl-cell.svelte';
import StatusCell from './cells/status-cell.svelte';
import TotalPnlCell from './cells/total-pnl-cell.svelte';
import DataTableSortableHeader from './data-table-sortable-header.svelte';
import RoiCell from './cells/roi-cell.svelte';

// Helper function to check if a position is open
function isPositionOpen(position: HistoricalPosition): boolean {
  return !position.close_date || position.close_date === null;
}

// Custom filter function for time period filtering
const timePeriodFilter: FilterFn<HistoricalPosition> = (
  row,
  columnId,
  filterValue,
) => {
  if (!filterValue || filterValue === 'ALL') {
    return true;
  }

  const position = row.original;
  const positionDate = new Date(position.time_bought);
  const now = new Date();
  const cutoffDate = new Date();

  switch (filterValue) {
    case '1D':
      cutoffDate.setDate(now.getDate() - 1);
      break;
    case '1W':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case '1M':
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case '1Y':
      cutoffDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return true;
  }

  return positionDate >= cutoffDate;
};

// Remove empty filter values
timePeriodFilter.autoRemove = (val: any) => !val || val === 'ALL';

// Helper function to get dollar equivalent value for sorting
function getDollarEquivalent(
  cost: string | null,
  tokenAddress: string | null,
): CurrencyAmount | null {
  if (!cost) {
    return null;
  }

  // Follow cost-cell pattern: use token if available, otherwise originalBaseToken
  let token;
  if (tokenAddress) {
    token = getTokenInfo(tokenAddress);
  } else {
    token = originalBaseToken;
  }

  if (!token) {
    return null;
  }

  try {
    const amount = CurrencyAmount.fromUnscaled(cost, token);
    const baseEquivalent = walletStore.convertTokenAmount(
      amount,
      token,
      getBaseToken(),
    );

    return baseEquivalent;
  } catch {
    return null;
  }
}

// Helper function to calculate net flow value for sorting
function getNetFlowValue(position: HistoricalPosition): CurrencyAmount | null {
  try {
    const baseToken = getBaseToken();
    let totalInflow = CurrencyAmount.fromScaled(0, baseToken);
    let totalOutflow = CurrencyAmount.fromScaled(0, baseToken);

    // Calculate inflows
    for (const [tokenAddress, amount] of Object.entries(
      position.token_inflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const inflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          inflowAmount,
          tokenInfo,
          baseToken,
        );
        if (convertedAmount) {
          totalInflow = totalInflow.add(convertedAmount);
        }
      }
    }

    // Calculate outflows
    for (const [tokenAddress, amount] of Object.entries(
      position.token_outflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const outflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          outflowAmount,
          tokenInfo,
          baseToken,
        );
        if (convertedAmount) {
          totalOutflow = totalOutflow.add(convertedAmount);
        }
      }
    }

    const netValue = totalInflow.rawValue().minus(totalOutflow.rawValue());
    return CurrencyAmount.fromRaw(netValue, baseToken);
  } catch {
    return null;
  }
}

// Helper function to calculate sale P&L value for sorting - matches sale-pnl-cell.svelte netSaleProfit calculation
function getSalePnlValue(position: HistoricalPosition): number {
  try {
    const metrics = calculatePositionMetrics(position);
    return metrics.netSaleProfit?.rawValue().toNumber() || 0;
  } catch {
    return 0;
  }
}

// Helper function to calculate total P&L value for sorting - matches total-pnl-cell.svelte realizedPnL calculation
function getTotalPnlValue(position: HistoricalPosition): number {
  try {
    const baseToken = getBaseToken();
    const isOpen = isPositionOpen(position);

    // Calculate total token inflow in base token equivalent
    let totalInflowBaseEquivalent = CurrencyAmount.fromScaled(0, baseToken);
    for (const [tokenAddress, amount] of Object.entries(
      position.token_inflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const inflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          inflowAmount,
          tokenInfo,
          baseToken,
        );
        if (convertedAmount) {
          totalInflowBaseEquivalent =
            totalInflowBaseEquivalent.add(convertedAmount);
        }
      }
    }

    // Calculate total token outflow in base token equivalent
    let totalOutflowBaseEquivalent = CurrencyAmount.fromScaled(0, baseToken);
    for (const [tokenAddress, amount] of Object.entries(
      position.token_outflows,
    )) {
      const tokenInfo = getTokenInfo(tokenAddress);
      if (tokenInfo) {
        const outflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
        const convertedAmount = walletStore.convertTokenAmount(
          outflowAmount,
          tokenInfo,
          baseToken,
        );
        if (convertedAmount) {
          totalOutflowBaseEquivalent =
            totalOutflowBaseEquivalent.add(convertedAmount);
        }
      }
    }

    // Calculate net token flow (inflow - outflow) in base token equivalent
    let netTokenFlow = null;
    if (totalInflowBaseEquivalent && totalOutflowBaseEquivalent) {
      const netValue = totalInflowBaseEquivalent
        .rawValue()
        .minus(totalOutflowBaseEquivalent.rawValue());
      netTokenFlow = CurrencyAmount.fromRaw(netValue, baseToken);
    }

    if (isOpen) {
      // For open positions, only show net flow as unrealized
      return netTokenFlow ? netTokenFlow.rawValue().toNumber() : 0;
    } else {
      // For closed positions, combine net flow + sale P&L
      if (!netTokenFlow) return 0;

      let total = CurrencyAmount.fromScaled(0, baseToken);

      // Add net token flow
      total = total.add(netTokenFlow);

      // Calculate net sale profit - matches total-pnl-cell logic
      const buyToken = position.buy_token_used
        ? getTokenInfo(position.buy_token_used)
        : originalBaseToken;
      const saleToken = position.sale_token_used
        ? getTokenInfo(position.sale_token_used)
        : originalBaseToken;

      if (buyToken && saleToken) {
        const buyAmount = CurrencyAmount.fromUnscaled(
          position.buy_cost_token,
          buyToken,
        );
        const sellAmount = CurrencyAmount.fromUnscaled(
          position.sale_revenue_token || '0',
          saleToken,
        );

        const buyCostBaseEquivalent = walletStore.convertTokenAmount(
          buyAmount,
          buyToken,
          baseToken,
        );
        const saleRevenueBaseEquivalent = walletStore.convertTokenAmount(
          sellAmount,
          saleToken,
          baseToken,
        );

        if (buyCostBaseEquivalent && saleRevenueBaseEquivalent) {
          const netValue = saleRevenueBaseEquivalent
            .rawValue()
            .minus(buyCostBaseEquivalent.rawValue());
          const netSaleProfit = CurrencyAmount.fromRaw(netValue, baseToken);
          total = total.add(netSaleProfit);
        }
      }

      return total.rawValue().toNumber();
    }
  } catch {
    return 0;
  }
}

// Helper function to get ROI value for sorting
function getRoiValue(position: HistoricalPosition): number {
  try {
    const metrics = calculatePositionMetrics(position);
    return metrics.roi || 0;
  } catch {
    return 0;
  }
}

// Export the custom filter function for external use
export { timePeriodFilter };

export const columns: ColumnDef<HistoricalPosition>[] = [
  {
    accessorKey: 'land_location',
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'Location',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
    enableSorting: true,
    sortingFn: 'alphanumeric',
    cell: ({ row }) => {
      const location = row.original.land_location;
      return renderComponent(LocationCell, { location: location.toString() });
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'Status',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
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
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'Bought',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
    enableSorting: true,
    sortingFn: 'datetime',
    enableColumnFilter: true,
    filterFn: timePeriodFilter,
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
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'Close',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
    enableSorting: true,
    sortingFn: 'datetime',
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = isPositionOpen(position);
      if (isOpen) {
        return '-';
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
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'Duration',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
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
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'Buy Cost',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const posA = rowA.original;
      const posB = rowB.original;
      const dollarA = getDollarEquivalent(
        posA.buy_cost_token,
        posA.buy_token_used,
      );
      const dollarB = getDollarEquivalent(
        posB.buy_cost_token,
        posB.buy_token_used,
      );
      const valueA = dollarA?.rawValue().toNumber() || 0;
      const valueB = dollarB?.rawValue().toNumber() || 0;
      return valueA - valueB;
    },
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
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'Sold For',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const posA = rowA.original;
      const posB = rowB.original;

      // Open positions should sort last (treat as 0 value)
      const isOpenA = isPositionOpen(posA);
      const isOpenB = isPositionOpen(posB);

      if (isOpenA && !isOpenB) return 1;
      if (!isOpenA && isOpenB) return -1;
      if (isOpenA && isOpenB) return 0;

      const dollarA = getDollarEquivalent(
        posA.sale_revenue_token,
        posA.sale_token_used,
      );
      const dollarB = getDollarEquivalent(
        posB.sale_revenue_token,
        posB.sale_token_used,
      );
      const valueA = dollarA?.rawValue().toNumber() || 0;
      const valueB = dollarB?.rawValue().toNumber() || 0;
      return valueA - valueB;
    },
    cell: ({ row }) => {
      const position = row.original;
      const isOpen = isPositionOpen(position);
      if (isOpen) {
        return '-';
      }
      return renderComponent(CostCell, {
        cost: position.sale_revenue_token,
        tokenAddress: position.sale_token_used,
      });
    },
  },
  {
    accessorKey: 'net_flow',
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'Net Flow',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const posA = rowA.original;
      const posB = rowB.original;
      const netFlowA = getNetFlowValue(posA);
      const netFlowB = getNetFlowValue(posB);
      const valueA = netFlowA?.rawValue().toNumber() || 0;
      const valueB = netFlowB?.rawValue().toNumber() || 0;
      return valueA - valueB;
    },
    cell: ({ row }) => {
      const position = row.original;
      return renderComponent(NetFlowCell, { position });
    },
  },
  {
    accessorKey: 'sale_pnl',
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'Sale P&L',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const posA = rowA.original;
      const posB = rowB.original;
      const salePnlA = getSalePnlValue(posA);
      const salePnlB = getSalePnlValue(posB);
      return salePnlA - salePnlB;
    },
    cell: ({ row }) => {
      const position = row.original;
      return renderComponent(SalePnlCell, { position });
    },
  },
  {
    accessorKey: 'total_pnl',
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'P&L',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const posA = rowA.original;
      const posB = rowB.original;
      const totalPnlA = getTotalPnlValue(posA);
      const totalPnlB = getTotalPnlValue(posB);
      return totalPnlA - totalPnlB;
    },
    cell: ({ row }) => {
      const position = row.original;
      return renderComponent(TotalPnlCell, { position, showShareButton: true });
    },
  },
  {
    accessorKey: 'roi',
    header: ({ column }) =>
      renderComponent(DataTableSortableHeader, {
        title: 'ROI',
        sortDirection: column.getIsSorted(),
        onclick: column.getToggleSortingHandler(),
      }),
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const posA = rowA.original;
      const posB = rowB.original;
      const roiA = getRoiValue(posA);
      const roiB = getRoiValue(posB);
      return roiA - roiB;
    },
    cell: ({ row }) => {
      const position = row.original;
      return renderComponent(RoiCell, { position });
    },
  },
];
