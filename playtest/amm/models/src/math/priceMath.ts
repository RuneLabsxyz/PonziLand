import { PRECISION, ROUNDING } from "../config"
import { BASE, OFFSET, MAX_LIMIT } from "../constants"
import { Decimal } from "decimal.js"

export const shiftLimit = (limit: Decimal.Value, width: Decimal.Value) => {
  const limitBN = new Decimal(limit)
  return limitBN.add(offset(width)).toFixed()
}

export const unshiftLimit = (limit: Decimal.Value, width: Decimal.Value) => {
  const limitBN = new Decimal(limit)
  return limitBN.sub(offset(width)).toFixed()
}

export const offset = (width: Decimal.Value) => {
  const offsetBN = new Decimal(OFFSET)
  return offsetBN.div(width).floor().mul(width).toFixed()
}

export const maxLimit = (width: Decimal.Value) => {
  const offsetDec = new Decimal(offset(width))
  const maxLimit = new Decimal(MAX_LIMIT)
  return offsetDec.add(maxLimit.div(width).floor().mul(width)).toFixed()
}

export const limitToSqrtPrice = (limit: Decimal.Value, width: Decimal.Value) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const unshifted = new Decimal(unshiftLimit(limit, width))
  const base = new Decimal(BASE)
  return base.pow(unshifted.div(2)).toFixed()
}

export const sqrtPriceToLimit = (sqrtPrice: Decimal.Value, width: Decimal.Value) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const sqrtPriceDec = new Decimal(sqrtPrice)
  const limit = sqrtPriceDec.log(2).mul(2).div(Decimal.log2(1.00001)).toDP(0, 1)
  const shifted = shiftLimit(limit, width)
  return shifted
}

export const priceToLimit = (price: Decimal.Value, width: Decimal.Value) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const priceDec = new Decimal(price)
  const limit = priceDec.log(2).div(Decimal.log2(1.00001)).toDP(0, 1)
  const shifted = shiftLimit(limit, width)
  return shifted
}
