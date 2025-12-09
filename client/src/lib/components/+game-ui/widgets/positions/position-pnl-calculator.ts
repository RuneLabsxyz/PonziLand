import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { getTokenInfo } from '$lib/utils';
import {
  walletStore,
  getBaseToken,
  originalBaseToken,
} from '$lib/stores/wallet.svelte';
import type { HistoricalPosition } from './historical-positions.service';

export interface TokenFlowDetail {
  token: any;
  amount: CurrencyAmount;
  baseEquivalent: CurrencyAmount;
}

export interface PositionMetrics {
  // Raw flows
  totalInflowBaseEquivalent: CurrencyAmount | null;
  totalOutflowBaseEquivalent: CurrencyAmount | null;
  netTokenFlow: CurrencyAmount | null;

  // Token flow details
  inflowTokens: TokenFlowDetail[];
  outflowTokens: TokenFlowDetail[];

  // Cost conversions
  buyCostBaseEquivalent: CurrencyAmount | null;
  saleRevenueBaseEquivalent: CurrencyAmount | null;

  // Token info
  buyToken: any;
  saleToken: any;
  buyAmount: CurrencyAmount | null;
  sellAmount: CurrencyAmount | null;

  // Calculated metrics
  netSaleProfit: CurrencyAmount | null;
  totalPnL: CurrencyAmount | null;
  roi: number | null;

  // Position state
  isOpen: boolean;
}

/**
 * Calculate token inflows with detailed breakdown
 */
export function calculateTokenInflows(position: HistoricalPosition): {
  total: CurrencyAmount | null;
  details: TokenFlowDetail[];
} {
  const baseToken = getBaseToken();
  let total = CurrencyAmount.fromScaled(0, baseToken);
  const details: TokenFlowDetail[] = [];

  for (const [tokenAddress, amount] of Object.entries(position.token_inflows)) {
    const tokenInfo = getTokenInfo(tokenAddress);
    if (tokenInfo) {
      const inflowAmount = CurrencyAmount.fromUnscaled(amount, tokenInfo);
      const convertedAmount = walletStore.convertTokenAmount(
        inflowAmount,
        tokenInfo,
        baseToken,
      );
      if (convertedAmount && !convertedAmount.isZero()) {
        total = total.add(convertedAmount);
        details.push({
          token: tokenInfo,
          amount: inflowAmount,
          baseEquivalent: convertedAmount,
        });
      }
    }
  }

  // Sort by base equivalent value (largest first)
  details.sort(
    (a, b) =>
      b.baseEquivalent.rawValue().toNumber() -
      a.baseEquivalent.rawValue().toNumber(),
  );

  return { total, details };
}

/**
 * Calculate token outflows with detailed breakdown
 */
export function calculateTokenOutflows(position: HistoricalPosition): {
  total: CurrencyAmount | null;
  details: TokenFlowDetail[];
} {
  const baseToken = getBaseToken();
  let total = CurrencyAmount.fromScaled(0, baseToken);
  const details: TokenFlowDetail[] = [];

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
      if (convertedAmount && !convertedAmount.isZero()) {
        total = total.add(convertedAmount);
        details.push({
          token: tokenInfo,
          amount: outflowAmount,
          baseEquivalent: convertedAmount,
        });
      }
    }
  }

  // Sort by base equivalent value (largest first)
  details.sort(
    (a, b) =>
      b.baseEquivalent.rawValue().toNumber() -
      a.baseEquivalent.rawValue().toNumber(),
  );

  return { total, details };
}

/**
 * Calculate net token flow (inflows - outflows)
 */
export function calculateNetTokenFlow(
  totalInflowBaseEquivalent: CurrencyAmount | null,
  totalOutflowBaseEquivalent: CurrencyAmount | null,
): CurrencyAmount | null {
  if (!totalInflowBaseEquivalent || !totalOutflowBaseEquivalent) return null;

  const baseToken = getBaseToken();
  const netValue = totalInflowBaseEquivalent
    .rawValue()
    .minus(totalOutflowBaseEquivalent.rawValue());

  return CurrencyAmount.fromRaw(netValue, baseToken);
}

/**
 * Get buy token info following position-entry pattern
 */
export function getBuyTokenInfo(position: HistoricalPosition) {
  if (position.buy_token_used) {
    return getTokenInfo(position.buy_token_used);
  } else {
    return originalBaseToken;
  }
}

/**
 * Get sale token info following position-entry pattern
 */
export function getSaleTokenInfo(position: HistoricalPosition) {
  if (position.sale_token_used) {
    return getTokenInfo(position.sale_token_used);
  } else {
    return originalBaseToken;
  }
}

/**
 * Calculate buy cost in base token equivalent
 */
export function calculateBuyCost(
  position: HistoricalPosition,
  buyToken: any,
): CurrencyAmount | null {
  if (!buyToken) return null;

  const buyAmount = CurrencyAmount.fromUnscaled(
    position.buy_cost_token,
    buyToken,
  );
  const baseToken = getBaseToken();

  return walletStore.convertTokenAmount(buyAmount, buyToken, baseToken);
}

/**
 * Calculate sale revenue in base token equivalent
 */
export function calculateSaleRevenue(
  position: HistoricalPosition,
  saleToken: any,
  isOpen: boolean,
): CurrencyAmount | null {
  if (!saleToken || isOpen || !position.sale_revenue_token) return null;

  const sellAmount = CurrencyAmount.fromUnscaled(
    position.sale_revenue_token,
    saleToken,
  );
  const baseToken = getBaseToken();

  return walletStore.convertTokenAmount(sellAmount, saleToken, baseToken);
}

/**
 * Calculate net sale profit (sale revenue - buy cost)
 * For open positions, shows unrealized loss (negative buy cost)
 * For nuked positions, shows full loss (negative buy cost)
 */
export function calculateNetSaleProfit(
  buyCostBaseEquivalent: CurrencyAmount | null,
  saleRevenueBaseEquivalent: CurrencyAmount | null,
  isOpen: boolean,
): CurrencyAmount | null {
  if (!buyCostBaseEquivalent) return null;

  const baseToken = getBaseToken();

  if (isOpen) {
    // For open positions, show unrealized loss (negative of buy cost)
    const unrealizedLoss = buyCostBaseEquivalent.rawValue().negated();
    return CurrencyAmount.fromRaw(unrealizedLoss, baseToken);
  } else {
    // For closed positions
    if (!saleRevenueBaseEquivalent) {
      // No sale revenue (nuked) - show full loss (negative buy cost)
      const totalLoss = buyCostBaseEquivalent.rawValue().negated();
      return CurrencyAmount.fromRaw(totalLoss, baseToken);
    } else {
      // Has sale revenue - calculate actual sale profit
      const netValue = saleRevenueBaseEquivalent
        .rawValue()
        .minus(buyCostBaseEquivalent.rawValue());
      return CurrencyAmount.fromRaw(netValue, baseToken);
    }
  }
}

/**
 * Calculate total P&L (net flow + sale P&L)
 * Always combines net token flow and sale P&L for complete picture
 */
export function calculateTotalPnL(
  netTokenFlow: CurrencyAmount | null,
  netSaleProfit: CurrencyAmount | null,
): CurrencyAmount | null {
  const baseToken = getBaseToken();

  // Always combine net flow + sale P&L for total position P&L
  if (!netTokenFlow && !netSaleProfit) return null;

  let total = CurrencyAmount.fromScaled(0, baseToken);

  if (netTokenFlow) {
    total = total.add(netTokenFlow);
  }

  if (netSaleProfit) {
    total = total.add(netSaleProfit);
  }

  return total;
}

/**
 * Calculate ROI percentage with zero-investment handling
 */
export function calculateROI(
  buyCostBaseEquivalent: CurrencyAmount | null,
  saleRevenueBaseEquivalent: CurrencyAmount | null,
  totalInflowBaseEquivalent: CurrencyAmount | null,
  totalOutflowBaseEquivalent: CurrencyAmount | null,
): number | null {
  if (
    !buyCostBaseEquivalent ||
    !totalInflowBaseEquivalent ||
    !totalOutflowBaseEquivalent
  ) {
    return null;
  }

  // Handle case where position is still open (no sell revenue yet)
  const sellRevenue =
    saleRevenueBaseEquivalent || CurrencyAmount.fromScaled(0, getBaseToken());

  // Calculate total investment = initial buy cost + outflows (taxes, fees)
  const totalInvestment = buyCostBaseEquivalent.add(totalOutflowBaseEquivalent);

  // Calculate total revenue = sell revenue + inflows
  const totalRevenue = sellRevenue.add(totalInflowBaseEquivalent);

  // Calculate profit/loss = revenue - investment
  const pnl = totalRevenue.rawValue().minus(totalInvestment.rawValue());

  // Handle zero total investment (free land with no fees/taxes)
  const investmentValue = totalInvestment.rawValue();
  if (investmentValue.isZero()) {
    // If we have profit on zero total investment, show very high return
    if (pnl.isPositive()) {
      return 9999; // Cap at 9999% for display (represents infinity)
    } else if (pnl.isZero()) {
      return 0; // No change on no investment
    } else {
      return -100; // Complete loss
    }
  }

  // Calculate ROI percentage = (pnl / total investment) * 100
  const roiPercent = pnl.dividedBy(investmentValue).multipliedBy(100);

  return roiPercent.toNumber();
}

/**
 * Check if position is still open
 */
export function isPositionOpen(position: HistoricalPosition): boolean {
  return !position.close_date || position.close_date === null;
}

/**
 * Master function to calculate all position metrics
 */
export function calculatePositionMetrics(
  position: HistoricalPosition,
): PositionMetrics {
  const isOpen = isPositionOpen(position);

  // Calculate token flows with details
  const inflowResult = calculateTokenInflows(position);
  const outflowResult = calculateTokenOutflows(position);
  const netTokenFlow = calculateNetTokenFlow(
    inflowResult.total,
    outflowResult.total,
  );

  // Get token info
  const buyToken = getBuyTokenInfo(position);
  const saleToken = getSaleTokenInfo(position);

  // Calculate amounts
  const buyAmount = buyToken
    ? CurrencyAmount.fromUnscaled(position.buy_cost_token, buyToken)
    : null;
  const sellAmount = saleToken
    ? CurrencyAmount.fromUnscaled(position.sale_revenue_token || '0', saleToken)
    : null;

  // Calculate cost conversions
  const buyCostBaseEquivalent = calculateBuyCost(position, buyToken);
  const saleRevenueBaseEquivalent = calculateSaleRevenue(
    position,
    saleToken,
    isOpen,
  );

  // Calculate derived metrics
  const netSaleProfit = calculateNetSaleProfit(
    buyCostBaseEquivalent,
    saleRevenueBaseEquivalent,
    isOpen,
  );
  const totalPnL = calculateTotalPnL(netTokenFlow, netSaleProfit);
  const roi = calculateROI(
    buyCostBaseEquivalent,
    saleRevenueBaseEquivalent,
    inflowResult.total,
    outflowResult.total,
  );

  return {
    // Raw flows
    totalInflowBaseEquivalent: inflowResult.total,
    totalOutflowBaseEquivalent: outflowResult.total,
    netTokenFlow,

    // Token flow details
    inflowTokens: inflowResult.details,
    outflowTokens: outflowResult.details,

    // Cost conversions
    buyCostBaseEquivalent,
    saleRevenueBaseEquivalent,

    // Token info
    buyToken,
    saleToken,
    buyAmount,
    sellAmount,

    // Calculated metrics
    netSaleProfit,
    totalPnL,
    roi,

    // Position state
    isOpen,
  };
}
