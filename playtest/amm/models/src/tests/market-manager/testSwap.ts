import Decimal from "decimal.js"
import { PRECISION, ROUNDING } from "../../config"
import { computeSwapAmount, nextSqrtPriceAmountIn, nextSqrtPriceAmountOut } from "../../libraries/swap"
import { limitToSqrtPrice, shiftLimit } from "../../math/priceMath"
import { maxLiquidityPerLimit } from "../../libraries/liquidity"
import { MAX_SCALED, OFFSET } from "../../constants"

type SwapCase = {
  isBuy: boolean
  exactInput: boolean
  amount: number | string
  thresholdSqrtPrice?: Decimal.Value
}

// Swap cases.
const swapCases: SwapCase[] = [
  {
    isBuy: false,
    exactInput: true,
    amount: 1,
    thresholdSqrtPrice: undefined,
  },
  {
    isBuy: true,
    exactInput: true,
    amount: 1,
    thresholdSqrtPrice: undefined,
  },
  {
    isBuy: false,
    exactInput: false,
    amount: 1,
    thresholdSqrtPrice: undefined,
  },
  {
    isBuy: true,
    exactInput: false,
    amount: 1,
    thresholdSqrtPrice: undefined,
  },
  {
    isBuy: false,
    exactInput: true,
    amount: 1,
    thresholdSqrtPrice: new Decimal(50).div(100).sqrt(),
  },
  {
    isBuy: true,
    exactInput: true,
    amount: 1,
    thresholdSqrtPrice: new Decimal(200).div(100).sqrt(),
  },
  {
    isBuy: false,
    exactInput: false,
    amount: 1,
    thresholdSqrtPrice: new Decimal(50).div(100).sqrt(),
  },
  {
    isBuy: true,
    exactInput: false,
    amount: 1,
    thresholdSqrtPrice: new Decimal(200).div(100).sqrt(),
  },
  {
    isBuy: false,
    exactInput: true,
    amount: "0.000000000000100000",
    thresholdSqrtPrice: undefined,
  },
  {
    isBuy: true,
    exactInput: true,
    amount: "0.000000000000100000",
    thresholdSqrtPrice: undefined,
  },
  {
    isBuy: false,
    exactInput: false,
    amount: "0.000000000000100000",
    thresholdSqrtPrice: undefined,
  },
  {
    isBuy: true,
    exactInput: false,
    amount: "0.000000000000100000",
    thresholdSqrtPrice: undefined,
  },
  {
    isBuy: true,
    exactInput: true,
    amount: MAX_SCALED,
    thresholdSqrtPrice: new Decimal(5).div(2).sqrt(),
  },
  {
    isBuy: false,
    exactInput: true,
    amount: MAX_SCALED,
    thresholdSqrtPrice: new Decimal(2).div(5).sqrt(),
  },
  {
    isBuy: true,
    exactInput: false,
    amount: MAX_SCALED,
    thresholdSqrtPrice: new Decimal(5).div(2).sqrt(),
  },
  {
    isBuy: false,
    exactInput: false,
    amount: MAX_SCALED,
    thresholdSqrtPrice: new Decimal(2).div(5).sqrt(),
  },
]

const marketCasesSimple = [
  {
    swapFeeRate: 0.0005,
    width: 1,
    startLimit: OFFSET + 0,
    startLiquidity: "20000000000",
  },
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(0, 10),
    startLiquidity: "20000000000",
  },
  {
    swapFeeRate: 0.01,
    width: 100,
    startLimit: shiftLimit(0, 100),
    startLiquidity: "20000000000",
  },
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(230260, 10),
    startLiquidity: "200000000000",
  },
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(-230260, 10),
    startLiquidity: "20000000000",
  },
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(10, 10),
    startLiquidity: "20000000000",
  },
]

// We switch between a simple and complex formula for running swap cases to keep the test logic as simple as possible.
// The simple formula assumes the swap occurs over a single limit interval, and calculates the swap amounts based on
// the `nextSqrtPrice` and `computeSwapAmount`. The more complex formula iterates over multiple limit intervals based
// on a defined map, similar to the logic run in the actual `swap()` function.
const testMarketCaseSimple = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  let marketCounter = 1
  for (const { swapFeeRate, width, startLimit, startLiquidity } of marketCasesSimple) {
    let swapCounter = 1

    for (const { isBuy, exactInput, amount, thresholdSqrtPrice } of swapCases) {
      // Find price reached.
      const netAmount = new Decimal(amount).mul(1 - swapFeeRate)
      const nextSqrtPrice = exactInput
        ? nextSqrtPriceAmountIn(limitToSqrtPrice(startLimit, width), startLiquidity, netAmount, isBuy)
        : nextSqrtPriceAmountOut(limitToSqrtPrice(startLimit, width), startLiquidity, amount, isBuy)
      const currSqrtPrice = limitToSqrtPrice(startLimit, width)
      let cappedNextSqrtPrice = thresholdSqrtPrice
        ? isBuy
          ? Decimal.min(nextSqrtPrice, thresholdSqrtPrice)
          : Decimal.max(nextSqrtPrice, thresholdSqrtPrice)
        : nextSqrtPrice

      // Calculate swap amounts.
      const { amountIn, amountOut, fee } = computeSwapAmount(
        currSqrtPrice,
        cappedNextSqrtPrice,
        startLiquidity,
        amount,
        swapFeeRate,
        exactInput
      )
      const grossAmountIn = new Decimal(amountIn).add(fee)

      if (
        (thresholdSqrtPrice &&
          (isBuy
            ? new Decimal(thresholdSqrtPrice).lt(currSqrtPrice)
            : new Decimal(thresholdSqrtPrice).gt(currSqrtPrice))) ||
        String(amountIn).startsWith("-")
      ) {
        console.log(`Market ${marketCounter}: Case ${swapCounter} (skipped)`)
      } else {
        console.log(`Market ${marketCounter}: Case ${swapCounter}`)
      }
      console.log({
        amountIn: new Decimal(grossAmountIn).mul(1e18).toFixed(0, 0),
        amountOut: new Decimal(amountOut).mul(1e18).toFixed(0, 1),
        fee: new Decimal(fee).mul(1e18).toFixed(0, 1),
      })
      swapCounter += 1
    }
    marketCounter += 1
  }
}

const marketCasesComplex = [
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(0, 10),
    startLiquidity: "0",
    liquidityMapBuy: {
      "10": "20000000000",
      "7906620": "0",
    },
    liquidityMapSell: {
      "-10": "20000000000",
      "-7906620": "0",
    },
  },
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(0, 10),
    startLiquidity: "20000000000",
    liquidityMapBuy: {
      "10": "40000000000",
      "7906620": "0",
    },
    liquidityMapSell: {
      "-10": "40000000000",
      "-7906620": "0",
    },
  },
  {
    swapFeeRate: 0.0005,
    width: 1,
    startLimit: shiftLimit(0, 1),
    startLiquidity: "1000000000000",
    liquidityMapBuy: {
      "10": "0",
    },
    liquidityMapSell: {
      "-10": "0",
    },
  },
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(10, 10), // set above 0 to set startLiquidity at 0
    startLiquidity: "0",
    liquidityMapBuy: {
      "7906620": "0",
    },
    liquidityMapSell: {
      "0": "200000000000",
      "-20000": "0",
    },
  },
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(-10, 10), // set below 0 to set startLiquidity at 0
    startLiquidity: "0",
    liquidityMapBuy: {
      "0": "200000000000",
      "20000": "0",
    },
    liquidityMapSell: {
      "-7906620": "0",
    },
  },
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(7906500, 10),
    startLiquidity: "20000000000",
    liquidityMapBuy: {
      "7906620": "0",
    },
    liquidityMapSell: {
      "-7906620": "0",
    },
  },
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(-7906500, 10),
    startLiquidity: "20000000000",
    liquidityMapBuy: {
      "7906620": "0",
    },
    liquidityMapSell: {
      "-7906620": "0",
    },
  },
  {
    swapFeeRate: 0.0025,
    width: 10,
    startLimit: shiftLimit(0, 10),
    startLiquidity: maxLiquidityPerLimit(10).toFixed(),
    liquidityMapBuy: {
      "7906620": "0",
    },
    liquidityMapSell: {
      "-7906620": "0",
    },
  },
]

const testMarketCaseComplex = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  let marketCounter = 6
  for (const {
    swapFeeRate,
    width,
    startLimit,
    startLiquidity,
    liquidityMapBuy,
    liquidityMapSell,
  } of marketCasesComplex) {
    let swapCounter = 1

    for (const { isBuy, exactInput, amount, thresholdSqrtPrice } of swapCases) {
      // Initialise variables.
      const liquidityMap = isBuy ? liquidityMapBuy : liquidityMapSell
      let liquidity = startLiquidity
      let iter = 0
      let amountRemaining = exactInput ? new Decimal(amount).mul(1 - swapFeeRate) : new Decimal(amount)
      let amountIn: Decimal.Value = 0
      let amountOut: Decimal.Value = 0
      let fee: Decimal.Value = 0
      let currSqrtPrice = new Decimal(limitToSqrtPrice(startLimit, width))

      for (const [targetLimit, newLiquidity] of Object.entries(liquidityMap)) {
        if (
          new Decimal(amountRemaining.toFixed(28, 1)).eq(0) ||
          (isBuy && thresholdSqrtPrice
            ? isBuy
              ? currSqrtPrice.gt(thresholdSqrtPrice)
              : currSqrtPrice.lt(thresholdSqrtPrice)
            : false)
        ) {
          break
        }

        const targetSqrtPrice = limitToSqrtPrice(shiftLimit(Number(targetLimit), width), width)
        if (!new Decimal(liquidity).eq(0)) {
          // Find price reached.
          const nextSqrtPrice = exactInput
            ? nextSqrtPriceAmountIn(currSqrtPrice, liquidity, amountRemaining, isBuy)
            : nextSqrtPriceAmountOut(currSqrtPrice, liquidity, amountRemaining, isBuy)
          const cappedNextSqrtPrice = thresholdSqrtPrice
            ? isBuy
              ? Decimal.min(nextSqrtPrice, thresholdSqrtPrice, targetSqrtPrice)
              : Decimal.max(nextSqrtPrice, thresholdSqrtPrice, targetSqrtPrice)
            : nextSqrtPrice
          const filledMax = cappedNextSqrtPrice.sub(targetSqrtPrice).lt(1e-28)

          // Calculate swap amounts.
          const {
            amountIn: amountInIter,
            amountOut: amountOutIter,
            fee: feeIter,
          } = computeSwapAmount(currSqrtPrice, cappedNextSqrtPrice, liquidity, amount, swapFeeRate, exactInput)
          const grossAmountInIter = new Decimal(amountInIter).add(feeIter)
          amountIn = new Decimal(amountIn).add(grossAmountInIter)
          amountOut = new Decimal(amountOut).add(amountOutIter)
          fee = new Decimal(fee).add(feeIter)
          amountRemaining = exactInput
            ? new Decimal(amountRemaining).sub(amountInIter)
            : new Decimal(amountRemaining).sub(amountOutIter)

          // Run next iteration.
          currSqrtPrice = cappedNextSqrtPrice
          if (filledMax) {
            liquidity = newLiquidity
          }
        } else {
          // Run next iteration.
          liquidity = newLiquidity
          currSqrtPrice = new Decimal(targetSqrtPrice)
        }

        iter += 1
      }
      if (
        (thresholdSqrtPrice &&
          (isBuy
            ? new Decimal(thresholdSqrtPrice).lt(currSqrtPrice)
            : new Decimal(thresholdSqrtPrice).gte(currSqrtPrice))) ||
        String(amountIn).startsWith("-") ||
        (new Decimal(amountIn).eq(0) && new Decimal(amountOut).eq(0))
      ) {
        console.log(`Market ${marketCounter}: Case ${swapCounter} (skipped)`)
      } else {
        console.log(`Market ${marketCounter}: Case ${swapCounter}`)
      }
      console.log({
        amountIn: new Decimal(amountIn).mul(1e18).toFixed(0, 0),
        amountOut: new Decimal(amountOut).mul(1e18).toFixed(0, 1),
        fee: new Decimal(fee).mul(1e18).toFixed(0, 0),
      })
      swapCounter += 1
    }
    marketCounter += 1
  }
}

testMarketCaseSimple()
testMarketCaseComplex()
