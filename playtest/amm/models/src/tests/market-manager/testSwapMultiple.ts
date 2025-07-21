import Decimal from "decimal.js"
import { limitToSqrtPrice, shiftLimit } from "../../math/priceMath"
import { PRECISION, ROUNDING } from "../../config"
import { computeSwapAmount, nextSqrtPriceAmountIn } from "../../libraries/swap"
import { calcFee } from "../../math/feeMath"

const testSwapMultiple = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const width = 1
  const swapAmount = 1
  const swapFeeRate = 0.003

  // Calculate ETH -> USDC swap amounts (swap leg 1)
  const liquidityEthUsdc = "20000000"
  const startLimitEthUsdc = shiftLimit(737780, width)
  const netAmountEthUsdc = new Decimal(swapAmount).mul(1 - swapFeeRate)
  const isBuyEthUsdc = false
  const nextSqrtPriceEthUsdc = nextSqrtPriceAmountIn(
    limitToSqrtPrice(startLimitEthUsdc, width),
    liquidityEthUsdc,
    netAmountEthUsdc,
    isBuyEthUsdc
  )
  const { amountOut: amountOutEthUsdc } = computeSwapAmount(
    limitToSqrtPrice(startLimitEthUsdc, width),
    nextSqrtPriceEthUsdc,
    liquidityEthUsdc,
    swapAmount,
    swapFeeRate,
    true
  )

  // Calculate USDC -> BTC swap amounts (swap leg 2)
  const liquidityBtcUsdc = "1000000"
  const startLimitBtcUsdc = shiftLimit(1016590, width)
  const netAmountBtcUsdc = new Decimal(amountOutEthUsdc).mul(1 - swapFeeRate)
  const isBuyBtcUsdc = true
  const nextSqrtPriceBtcUsdc = nextSqrtPriceAmountIn(
    limitToSqrtPrice(startLimitBtcUsdc, width),
    liquidityBtcUsdc,
    netAmountBtcUsdc,
    isBuyBtcUsdc
  )
  const { amountOut: amountOutBtcUsdc } = computeSwapAmount(
    limitToSqrtPrice(startLimitBtcUsdc, width),
    nextSqrtPriceBtcUsdc,
    liquidityBtcUsdc,
    amountOutEthUsdc,
    swapFeeRate,
    true
  )

  console.log({
    amountOut: new Decimal(amountOutBtcUsdc).mul(1e18).toFixed(0, 1),
  })
}

testSwapMultiple()
