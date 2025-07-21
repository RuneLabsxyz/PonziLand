import Decimal from "decimal.js"
import { nextSqrtPriceAmountIn } from "../../libraries/swap"
import { ONE } from "../../constants"

const testNextSqrtPriceIn = () => {
  const max = new Decimal(2).pow(256)
  const cases = [
    { currSqrtPrice: 1, liquidity: 1, amountIn: max, isBuy: false },
    { currSqrtPrice: 256, liquidity: 100, amountIn: 0, isBuy: false },
    { currSqrtPrice: 256, liquidity: 100, amountIn: 0, isBuy: true },
    { currSqrtPrice: max, liquidity: max, amountIn: max, isBuy: false },
    { currSqrtPrice: ONE, liquidity: ONE, amountIn: new Decimal(ONE).div(10), isBuy: true },
    { currSqrtPrice: ONE, liquidity: ONE, amountIn: new Decimal(ONE).div(10), isBuy: false },
    { currSqrtPrice: ONE, liquidity: 1, amountIn: max.div(2), isBuy: false },
  ]

  for (const { currSqrtPrice, liquidity, amountIn, isBuy } of cases) {
    const nextSqrtPrice = nextSqrtPriceAmountIn(currSqrtPrice, liquidity, amountIn, isBuy)
    console.log(`nextSqrtPrice: ${nextSqrtPrice.toFixed(28, 0)}`)
  }
}

testNextSqrtPriceIn()
