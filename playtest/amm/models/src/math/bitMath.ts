import Decimal from "decimal.js"

export const msb = (x: Decimal.Value) => {
  // Convert to BigInt
  const number = BigInt(String(x))

  // Iterate through bits and return index of first set bit
  for (let i = 255; i >= 0; i--) {
    if ((number & (1n << BigInt(i))) !== 0n) {
      return i
    }
  }

  // Return -1 if no bits are set (number is 0)
  return -1
}
