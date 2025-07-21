import Decimal from "decimal.js"
import { PRECISION, ROUNDING } from "../config"

export const pow = (quote: Decimal.Value, exp: Decimal.Value) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const quoteDec = new Decimal(quote)
  return quoteDec.pow(exp).toFixed()
}

export const mulDiv = (a: Decimal.Value, b: Decimal.Value, c: Decimal.Value) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const aDec = new Decimal(a)
  return aDec.mul(b).div(c).toFixed()
}
