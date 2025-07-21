import Decimal from "decimal.js"
import { PRECISION, ROUNDING } from "../../config"
import { mulDiv } from "../../math/math"

const testMath = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const cases = [
    { base: 0, exp: 0 },
    { base: 0, exp: 1 },
    { base: 0, exp: 31953 },
    { base: 1, exp: 0 },
    { base: 1, exp: 1 },
    { base: 1, exp: 31953 },
    { base: 2, exp: 3 },
    { base: 10, exp: 4 },
    { base: "115792089237316195423570985008687907853269984665640564039457584007913129639936", exp: 1 },
    { base: "340282366920938463463374607431768211455", exp: 2 },
  ]

  for (const { base, exp } of cases) {
    const expected = new Decimal(base).pow(exp)
    console.log(`pow(${base}, ${exp}) = ${expected}`)
  }
}

const testMulDiv = () => {
  const max = "11579208923731619542357098500868790785326998466564.0564039457584007913129639936"
  const cases = [
    { x: 1e-28, y: 1e-28, d: 1e-28, roundUp: false },
    { x: 1e-28, y: 1e-28, d: 1e-28, roundUp: true },
    { x: 1, y: 1e-28, d: 2e-28, roundUp: false },
    { x: 1, y: 1e-28, d: 2e-28, roundUp: true },
    { x: 1, y: 5e-28, d: 30e-28, roundUp: false },
    { x: 1, y: 5e-28, d: 30e-28, roundUp: true },
    { x: 1, y: 1, d: 5, roundUp: false },
    { x: 1, y: 1, d: 5, roundUp: true },
    { x: 1, y: 1, d: 3, roundUp: false },
    { x: 1, y: 1, d: 3, roundUp: true },
    { x: max, y: max, d: max, roundUp: false }, // round down by 1
    { x: max, y: max, d: max, roundUp: true },
  ]

  for (const { x, y, d, roundUp } of cases) {
    Decimal.set({ precision: PRECISION, rounding: roundUp ? Decimal.ROUND_UP : Decimal.ROUND_DOWN })
    const expected = new Decimal(mulDiv(x, y, d)).toFixed(28, roundUp ? 0 : 1)
    console.log(`mulDiv(${x}, ${y}, ${d}, ${roundUp}) = ${expected}`)
  }
}

// testMath()
testMulDiv()
