/**
 * @notice Formats an address for display
 * @dev Shortens address to first 6 and last 4 characters
 * @param address The address to format
 * @returns Formatted address string
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * @notice Formats a value for display
 * @dev Corrects and converts hex values to decimal strings
 * @param value The value to format
 * @returns Formatted value string
 */
export function formatValue(value: string): string {
  const correctedValue = value.startsWith('00x')
    ? value.replace('00x', '0x')
    : value;

  // remove after decimal point
  const cleanedDecimals = correctedValue.split('.')[0];

  const bigValue = BigInt(cleanedDecimals);

  return bigValue.toString(10);
}

export function areAddressesEquals(a: string, b: string): boolean {
  try {
    return BigInt(a) == BigInt(b);
  } catch (error) {
    return false;
  }
}
