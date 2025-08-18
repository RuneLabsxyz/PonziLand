import Decimal from "decimal.js"
import { PRECISION, ROUNDING } from "../config"

export const calcFee = (grossAmount: Decimal.Value, feeRate: Decimal.Value) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  let grossAmountDec = new Decimal(grossAmount)
  let fee = grossAmountDec.mul(feeRate)
  return fee.toFixed()
}

export const netToFee = (netAmount: Decimal.Value, feeRate: Decimal.Value) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  let netAmountBN = new Decimal(netAmount)
  let one = new Decimal(1)
  let fee = netAmountBN.mul(feeRate).div(one.sub(feeRate))
  return fee.toFixed()
}

export const netToGross = (netAmount: Decimal.Value, feeRate: Decimal.Value) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  let netAmountBN = new Decimal(netAmount)
  let one = new Decimal(1)
  let fee = netAmountBN.div(one.sub(feeRate))
  return fee.toFixed()
}

export const grossToNet = (grossAmount: Decimal.Value, feeRate: Decimal.Value) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  let grossAmountDec = new Decimal(grossAmount)
  let one = new Decimal(1)
  let netAmount = grossAmountDec.mul(one.sub(feeRate))
  return netAmount.toFixed()
}

export const getFeeInside = (
  lowerBaseFeeFactor: Decimal.Value,
  lowerQuoteFeeFactor: Decimal.Value,
  upperBaseFeeFactor: Decimal.Value,
  upperQuoteFeeFactor: Decimal.Value,
  lowerLimit: Decimal.Value,
  upperLimit: Decimal.Value,
  currLimit: Decimal.Value,
  marketBaseFeeFactor: Decimal.Value,
  marketQuoteFeeFactor: Decimal.Value
) => {
  const currLimitDec = new Decimal(currLimit)
  const marketBaseFeeFactorDec = new Decimal(marketBaseFeeFactor)
  const marketQuoteFeeFactorDec = new Decimal(marketQuoteFeeFactor)

  const baseFeesBelow = currLimitDec.gte(lowerLimit)
    ? lowerBaseFeeFactor
    : marketBaseFeeFactorDec.sub(lowerBaseFeeFactor)
  const baseFeesAbove = currLimitDec.lt(upperLimit)
    ? upperBaseFeeFactor
    : marketBaseFeeFactorDec.sub(upperBaseFeeFactor)
  const quoteFeesBelow = currLimitDec.gte(lowerLimit)
    ? lowerQuoteFeeFactor
    : marketQuoteFeeFactorDec.sub(lowerQuoteFeeFactor)
  const quoteFeesAbove = currLimitDec.lt(upperLimit)
    ? upperQuoteFeeFactor
    : marketQuoteFeeFactorDec.sub(upperQuoteFeeFactor)

  const baseFeeFactor = marketBaseFeeFactorDec.sub(baseFeesBelow).sub(baseFeesAbove).toFixed()
  const quoteFeeFactor = marketQuoteFeeFactorDec.sub(quoteFeesBelow).sub(quoteFeesAbove).toFixed()

  return { baseFeeFactor, quoteFeeFactor }
}
