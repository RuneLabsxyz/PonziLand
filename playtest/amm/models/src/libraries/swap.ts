import Decimal from "decimal.js"
import { calcFee, grossToNet, netToFee } from "../math/feeMath"
import { liquidityToBase, liquidityToQuote } from "../math/liquidityMath"
import { PRECISION, ROUNDING } from "../config"

export const nextSqrtPriceAmountIn = (
  currSqrtPrice: Decimal.Value,
  liquidity: Decimal.Value,
  amountIn: Decimal.Value,
  isBuy: boolean
) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const currSqrtPriceBN = new Decimal(currSqrtPrice)
  const liquidityBN = new Decimal(liquidity)
  const amountInBN = new Decimal(amountIn)
  const nextSqrtPrice = isBuy
    ? currSqrtPriceBN.add(amountInBN.div(liquidityBN))
    : liquidityBN.mul(currSqrtPriceBN).div(liquidityBN.add(amountInBN.mul(currSqrtPriceBN)))
  return nextSqrtPrice
}

export const nextSqrtPriceAmountOut = (
  currSqrtPrice: Decimal.Value,
  liquidity: Decimal.Value,
  amountOut: Decimal.Value,
  isBuy: boolean
) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const currSqrtPriceBN = new Decimal(currSqrtPrice)
  const liquidityBN = new Decimal(liquidity)
  const amountOutBN = new Decimal(amountOut)
  const nextSqrtPrice = isBuy
    ? liquidityBN.mul(currSqrtPriceBN).div(liquidityBN.sub(amountOutBN.mul(currSqrtPriceBN)))
    : currSqrtPriceBN.sub(amountOutBN.div(liquidityBN))
  return nextSqrtPrice
}

// Loosely based on the Uniswap V3 implementation as a cross-check.
export const computeSwapAmount = (
  currSqrtPrice: Decimal.Value,
  targetSqrtPrice: Decimal.Value,
  liquidity: Decimal.Value,
  amountRem: Decimal.Value,
  feeRate: number,
  exactInput: boolean
) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const isBuy = new Decimal(targetSqrtPrice).gt(currSqrtPrice)
  let amountIn: Decimal.Value = "0"
  let amountOut: Decimal.Value = "0"
  let nextSqrtPrice: Decimal.Value = "0"
  let fee: Decimal.Value = "0"

  if (exactInput) {
    const amountRemainingLessFee = grossToNet(amountRem, feeRate)
    amountIn = isBuy
      ? liquidityToQuote(currSqrtPrice, targetSqrtPrice, liquidity)
      : liquidityToBase(targetSqrtPrice, currSqrtPrice, liquidity)
    if (new Decimal(amountRemainingLessFee).gte(amountIn)) {
      nextSqrtPrice = targetSqrtPrice
    } else {
      nextSqrtPrice = nextSqrtPriceAmountIn(currSqrtPrice, liquidity, amountRemainingLessFee, isBuy)
    }
  } else {
    amountOut = isBuy
      ? liquidityToBase(currSqrtPrice, targetSqrtPrice, liquidity)
      : liquidityToQuote(targetSqrtPrice, currSqrtPrice, liquidity)
    if (new Decimal(amountRem).gte(amountOut)) {
      nextSqrtPrice = targetSqrtPrice
    } else {
      nextSqrtPrice = nextSqrtPriceAmountOut(currSqrtPrice, liquidity, amountRem, isBuy)
    }
  }

  const max = targetSqrtPrice === nextSqrtPrice

  if (isBuy) {
    if (!max || !exactInput) {
      amountIn = liquidityToQuote(currSqrtPrice, nextSqrtPrice, liquidity)
    }
    if (!max || exactInput) {
      amountOut = liquidityToBase(currSqrtPrice, nextSqrtPrice, liquidity)
    }
  } else {
    if (!max || !exactInput) {
      amountIn = liquidityToBase(nextSqrtPrice, currSqrtPrice, liquidity)
    }
    if (!max || exactInput) {
      amountOut = liquidityToQuote(nextSqrtPrice, currSqrtPrice, liquidity)
    }
  }

  if (!exactInput && amountOut > amountRem) {
    amountOut = amountRem
  }

  // In Uniswap, if target price is not reached, LP takes the remainder of the maximum input as fee.
  // We don't do that here.
  fee = netToFee(amountIn, feeRate)

  return { nextSqrtPrice, amountIn, amountOut, fee }
}
