import { Decimal } from "decimal.js"
import { limitToSqrtPrice } from "./priceMath"
import { PRECISION, ROUNDING } from "../config"

export const addDelta = (liquidity: Decimal.Value, delta: Decimal.Value) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const liquidityDec = new Decimal(liquidity)
  return liquidityDec.add(delta).toFixed()
}

export const liquidityToQuote = (
  lowerSqrtPrice: Decimal.Value,
  upperSqrtPrice: Decimal.Value,
  liquidityDelta: Decimal.Value
) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const upperSqrtPriceDec = new Decimal(upperSqrtPrice)
  const liquidityDeltaDec = new Decimal(liquidityDelta)
  return liquidityDeltaDec.mul(upperSqrtPriceDec.sub(lowerSqrtPrice))
}

export const liquidityToBase = (
  lowerSqrtPrice: Decimal.Value,
  upperSqrtPrice: Decimal.Value,
  liquidityDelta: Decimal.Value
) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const upperSqrtPriceDec = new Decimal(upperSqrtPrice)
  const liquidityDeltaDec = new Decimal(liquidityDelta)
  return liquidityDeltaDec.mul(upperSqrtPriceDec.sub(lowerSqrtPrice)).div(upperSqrtPriceDec.mul(lowerSqrtPrice))
}

export const quoteToLiquidity = (
  lowerSqrtPrice: Decimal.Value,
  upperSqrtPrice: Decimal.Value,
  quoteAmount: Decimal.Value
) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const upperSqrtPriceDec = new Decimal(upperSqrtPrice)
  const quoteAmountDec = new Decimal(quoteAmount)
  return quoteAmountDec.div(upperSqrtPriceDec.sub(lowerSqrtPrice))
}

export const baseToLiquidity = (
  lowerSqrtPrice: Decimal.Value,
  upperSqrtPrice: Decimal.Value,
  baseAmount: Decimal.Value
) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const lowerSqrtPriceBN = new Decimal(lowerSqrtPrice)
  const upperSqrtPriceBN = new Decimal(upperSqrtPrice)
  const baseAmountDec = new Decimal(baseAmount)
  const liquidity = baseAmountDec
    .mul(upperSqrtPriceBN.mul(lowerSqrtPriceBN))
    .div(upperSqrtPriceBN.sub(lowerSqrtPriceBN))
  return liquidity
}

export type TokenAmounts = {
  baseAmount: string
  quoteAmount: string
}

export const liquidityToAmounts = (
  liquidityDelta: Decimal.Value,
  currSqrtPrice: Decimal.Value,
  lowerSqrtPrice: Decimal.Value,
  upperSqrtPrice: Decimal.Value
): TokenAmounts => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  let upperSqrtPriceDec = new Decimal(upperSqrtPrice)
  let lowerSqrtPriceDec = new Decimal(lowerSqrtPrice)

  if (upperSqrtPriceDec.lte(currSqrtPrice)) {
    return {
      baseAmount: "0",
      quoteAmount: liquidityToQuote(lowerSqrtPrice, upperSqrtPrice, liquidityDelta).toFixed(),
    }
  } else if (lowerSqrtPriceDec.lte(currSqrtPrice)) {
    return {
      baseAmount: liquidityToBase(currSqrtPrice, upperSqrtPrice, liquidityDelta).toFixed(),
      quoteAmount: liquidityToQuote(lowerSqrtPrice, currSqrtPrice, liquidityDelta).toFixed(),
    }
  } else {
    return {
      baseAmount: liquidityToBase(lowerSqrtPrice, upperSqrtPrice, liquidityDelta).toFixed(),
      quoteAmount: "0",
    }
  }
}
