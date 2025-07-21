import Decimal from "decimal.js"
import { PRECISION, ROUNDING } from "../../config"
import { limitToSqrtPrice, shiftLimit, sqrtPriceToLimit, unshiftLimit } from "../../math/priceMath"
import { baseToLiquidity, liquidityToQuote, quoteToLiquidity } from "../../math/liquidityMath"
import { computeSwapAmount, nextSqrtPriceAmountIn } from "../../libraries/swap"
import { calcFee } from "../../math/feeMath"

// Tests

const testStrategy = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  const baseAmount = 10000
  const quoteAmount = 125000000
  const width = 1
  const startLimit = Number(shiftLimit(741930, width))

  // Deposit.
  const bidLower = shiftLimit(721930, width)
  const bidUpper = shiftLimit(741930, width)
  const askLower = shiftLimit(742550, width)
  const askUpper = shiftLimit(762550, width)
  const bidLiquidity = quoteToLiquidity(
    limitToSqrtPrice(bidLower, width),
    limitToSqrtPrice(bidUpper, width),
    quoteAmount
  )
  const askLiquidity = baseToLiquidity(limitToSqrtPrice(askLower, width), limitToSqrtPrice(askUpper, width), baseAmount)

  // Execute swap.
  const swapAmount = 10
  const swapFeeRate = 0.003
  const protocolShare = 0.002
  const isBuy = true
  const netAmount = new Decimal(swapAmount).mul(1 - swapFeeRate)
  const nextSqrtPrice = nextSqrtPriceAmountIn(limitToSqrtPrice(askLower, width), askLiquidity, netAmount, isBuy)
  const endLimit = Number(sqrtPriceToLimit(nextSqrtPrice, width))
  const { amountIn, amountOut, fee } = computeSwapAmount(
    limitToSqrtPrice(askLower, width),
    nextSqrtPrice,
    askLiquidity,
    swapAmount,
    swapFeeRate,
    isBuy
  )
  const protocolFee = calcFee(fee, protocolShare)
  const grossAmountIn = new Decimal(amountIn).add(fee).sub(protocolFee)

  console.log({
    amountIn: new Decimal(grossAmountIn).mul(1e18).toFixed(0, 1),
    amountOut: new Decimal(amountOut).mul(1e18).toFixed(0, 1),
    fee: new Decimal(fee).mul(1e18).toFixed(0, 1),
    bidLower,
    bidUpper,
    bidLiquidity: new Decimal(bidLiquidity).mul(1e18).toFixed(0, 1),
    askLower,
    askUpper,
    askLiquidity: new Decimal(askLiquidity).mul(1e18).toFixed(0, 1),
    nextSqrtPrice: new Decimal(nextSqrtPrice).mul(1e28).toFixed(0, 1),
    endLimit: unshiftLimit(endLimit, width),
  })
}

testStrategy()
