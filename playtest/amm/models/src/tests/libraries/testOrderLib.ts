import { Decimal } from "decimal.js"
import { OFFSET } from "../../constants"
import { liquidityToAmounts } from "../../math/liquidityMath"
import { limitToSqrtPrice } from "../../math/priceMath"

const testAmountsInsideOrderBid = () => {
  const liquidityDelta = 20000
  const currSqrtPrice = 1
  const lowerSqrtPrice = limitToSqrtPrice(OFFSET - 1000, 1)
  const upperSqrtPrice = limitToSqrtPrice(OFFSET - 999, 1)
  const { baseAmount, quoteAmount } = liquidityToAmounts(liquidityDelta, currSqrtPrice, lowerSqrtPrice, upperSqrtPrice)
  console.log({
    baseAmount: new Decimal(baseAmount).mul(1e18).toFixed(0),
    quoteAmount: new Decimal(quoteAmount).mul(1e18).toFixed(0),
  })
}

const testAmountsInsideOrderAsk = () => {
  const liquidityDelta = 20000
  const currSqrtPrice = 1
  const lowerSqrtPrice = limitToSqrtPrice(OFFSET + 1000, 1)
  const upperSqrtPrice = limitToSqrtPrice(OFFSET + 1001, 1)
  const { baseAmount, quoteAmount } = liquidityToAmounts(liquidityDelta, currSqrtPrice, lowerSqrtPrice, upperSqrtPrice)
  console.log({
    baseAmount: new Decimal(baseAmount).mul(1e18).toFixed(0),
    quoteAmount: new Decimal(quoteAmount).mul(1e18).toFixed(0),
  })
}

// testAmountsInsideOrderBid()
testAmountsInsideOrderAsk()
