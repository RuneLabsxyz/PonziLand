/**
 * Format percentage with appropriate precision based on the value magnitude
 * @param value - The percentage value to format
 * @param includeSign - Whether to include the +/- sign (default: true)
 * @returns Formatted percentage string with % symbol
 */
export function formatPercentage(
  value: number,
  includeSign: boolean = true,
): string {
  const abs = Math.abs(value);
  let precision: number;

  if (abs >= 10) {
    precision = 1;
  } else if (abs >= 1) {
    precision = 2;
  } else if (abs >= 0.01) {
    precision = 3;
  } else {
    precision = 4;
  }

  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(precision)}%`;
}

/**
 * Format percentage with custom precision
 * @param value - The percentage value to format
 * @param precision - Number of decimal places
 * @param includeSign - Whether to include the +/- sign (default: true)
 * @returns Formatted percentage string with % symbol
 */
export function formatPercentageFixed(
  value: number,
  precision: number,
  includeSign: boolean = true,
): string {
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(precision)}%`;
}
