export function toHexWithPadding(value: number | bigint, paddingLength = 64) {
    // Ensure the value is a bigint for consistent handling
    const bigIntValue = typeof value === 'bigint' ? value : BigInt(value);
  
    // Convert the bigint to a hexadecimal string
    let hex = bigIntValue.toString(16);
  
    // Ensure it's lowercase and pad it to the desired length
    hex = hex.toLowerCase().padStart(paddingLength, '0');
  
    // Add the 0x prefix
    return '0x' + hex;
  }

  
  export function padAddress(address: string) {
    // test if start with 0x
    if (!address.startsWith('0x')) {
      return;
    }
    // get what is after 0x
    const addressEnd = address.slice(2);
    // padd for 66 char
    const addressPadded = addressEnd.padStart(64, '0');
  
    return `0x${addressPadded}`;
  }

  export function shortenHex(hex: string | null | undefined, length = 4) {
    if (!hex) {
      return '0xundefined';
    }
  
    if (!hex.startsWith('0x')) {
      return hex;
    }
  
    if (hex.length <= 2 + 2 * length) {
      // No shortening needed
      return hex;
    }
  
    const start = hex.slice(0, 2 + length);
    const end = hex.slice(-length);
    return `${start}...${end}`;
  }