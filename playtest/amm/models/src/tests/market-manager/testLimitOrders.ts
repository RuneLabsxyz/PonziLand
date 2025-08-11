import Decimal from "decimal.js"
import { OFFSET } from "../../constants"
import { computeSwapAmount, nextSqrtPriceAmountIn } from "../../libraries/swap"
import { limitToSqrtPrice } from "../../math/priceMath"
import { calcFee, netToGross } from "../../math/feeMath"
import { PRECISION, ROUNDING } from "../../config"
import { liquidityToAmounts, liquidityToBase, liquidityToQuote } from "../../math/liquidityMath"

const testCreateMultipleBidOrders = () => {
  // Create first limit order.
  const { baseAmount: baseAmount1, quoteAmount: quoteAmount1 } = liquidityToAmounts(
    "10000",
    limitToSqrtPrice(OFFSET - 0, 1),
    limitToSqrtPrice(OFFSET - 1000, 1),
    limitToSqrtPrice(OFFSET - 999, 1)
  )
  console.log({
    baseAmount: new Decimal(baseAmount1).mul(1e18).toFixed(0, 1),
    quoteAmount: new Decimal(quoteAmount1).mul(1e18).toFixed(0, 1),
  })

  // Create second limit order.
  const { baseAmount: baseAmount2, quoteAmount: quoteAmount2 } = liquidityToAmounts(
    "20000",
    limitToSqrtPrice(OFFSET - 0, 1),
    limitToSqrtPrice(OFFSET - 1000, 1),
    limitToSqrtPrice(OFFSET - 999, 1)
  )
  console.log({
    baseAmount: new Decimal(baseAmount2).mul(1e18).toFixed(0, 1),
    quoteAmount: new Decimal(quoteAmount2).mul(1e18).toFixed(0, 1),
  })
}

const testCreateMultipleAskOrders = () => {
  // Create first limit order.
  const { baseAmount: baseAmount1, quoteAmount: quoteAmount1 } = liquidityToAmounts(
    "10000",
    limitToSqrtPrice(OFFSET - 0, 1),
    limitToSqrtPrice(OFFSET + 1000, 1),
    limitToSqrtPrice(OFFSET + 1001, 1)
  )
  console.log({
    baseAmount: new Decimal(baseAmount1).mul(1e18).toFixed(0, 1),
    quoteAmount: new Decimal(quoteAmount1).mul(1e18).toFixed(0, 1),
  })

  // Create second limit order.
  const { baseAmount: baseAmount2, quoteAmount: quoteAmount2 } = liquidityToAmounts(
    "20000",
    limitToSqrtPrice(OFFSET - 0, 1),
    limitToSqrtPrice(OFFSET + 1000, 1),
    limitToSqrtPrice(OFFSET + 1001, 1)
  )
  console.log({
    baseAmount: new Decimal(baseAmount2).mul(1e18).toFixed(0, 1),
    quoteAmount: new Decimal(quoteAmount2).mul(1e18).toFixed(0, 1),
  })
}

const testSwapFullyFillsBidLimitOrders = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const { amountIn, amountOut, fee } = computeSwapAmount(
    limitToSqrtPrice(OFFSET - 999, 1),
    limitToSqrtPrice(OFFSET - 1000, 1),
    "1500000",
    "10",
    0.003,
    true
  )
  const grossAmountIn = new Decimal(amountIn).add(fee)

  console.log({
    baseAmount: new Decimal(grossAmountIn).mul(1e18).toFixed(0, 1),
  })
}

const testSwapFullyFillsAskLimitOrders = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const { amountIn, amountOut, fee } = computeSwapAmount(
    limitToSqrtPrice(OFFSET + 1000, 1),
    limitToSqrtPrice(OFFSET + 1001, 1),
    "1500000",
    "10",
    0.003,
    true
  )
  const grossAmountIn = new Decimal(amountIn).add(fee)

  console.log({
    quoteAmount: new Decimal(grossAmountIn).mul(1e18).toFixed(0, 1),
  })
}

const testCreateAndCollectUnfilledBidOrder = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const amountIn = liquidityToQuote(limitToSqrtPrice(OFFSET - 1000, 1), limitToSqrtPrice(OFFSET - 999, 1), "1000000")

  console.log({
    amountIn: new Decimal(amountIn).mul(1e18).toFixed(0, 1),
  })
}
const testCreateAndCollectUnfilledAskOrder = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const amountIn = liquidityToBase(limitToSqrtPrice(OFFSET + 1000, 1), limitToSqrtPrice(OFFSET + 1001, 1), "1000000")

  console.log({
    amountIn: new Decimal(amountIn).mul(1e18).toFixed(0, 1),
  })
}

const testCreateAndCollectFullyFilledBidOrder = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const { amountIn, amountOut, fee } = computeSwapAmount(
    limitToSqrtPrice(OFFSET - 999, 1),
    limitToSqrtPrice(OFFSET - 1000, 1),
    "1000000",
    "10",
    0.003,
    true
  )
  const grossAmountIn = new Decimal(amountIn).add(fee)

  console.log({
    baseAmount: new Decimal(grossAmountIn).mul(1e18).toFixed(0, 1),
    quoteAmount: new Decimal(amountOut).mul(1e18).toFixed(0, 1),
  })
}

const testCreateAndCollectFullyFilledAskOrder = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const { amountIn, amountOut, fee } = computeSwapAmount(
    limitToSqrtPrice(OFFSET + 1000, 1),
    limitToSqrtPrice(OFFSET + 1001, 1),
    "1000000",
    "10",
    0.003,
    true
  )
  const grossAmountIn = new Decimal(amountIn).add(fee)

  console.log({
    baseAmount: new Decimal(amountOut).mul(1e18).toFixed(0, 1),
    quoteAmount: new Decimal(grossAmountIn).mul(1e18).toFixed(0, 1),
  })
}

const testCreateAndCollectPartiallyFilledBidOrder = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  // Order amount.
  const quoteAmount = liquidityToQuote(limitToSqrtPrice(OFFSET - 1000, 1), limitToSqrtPrice(OFFSET - 999, 1), "1500000")

  // Find price reached.
  const netAmount = new Decimal(6).mul(1 - 0.003)
  const nextSqrtPrice = nextSqrtPriceAmountIn(limitToSqrtPrice(OFFSET - 999, 1), "500000", netAmount, false)

  const { amountIn, amountOut, fee } = computeSwapAmount(
    limitToSqrtPrice(OFFSET - 999, 1),
    nextSqrtPrice,
    "1500000",
    "6",
    0.003,
    true
  )
  console.log("Limit order 1")
  console.log({
    quoteAmount: new Decimal(quoteAmount).mul(1e18).mul(1).div(3).toFixed(0, 1),
    amountFilled: new Decimal(amountOut).mul(1e18).mul(1).div(3).toFixed(0, 1),
    amountEarned: new Decimal(amountIn).add(fee).mul(1e18).mul(1).div(3).toFixed(0, 1),
    fee: new Decimal(fee).mul(1e18).mul(1).div(3).toFixed(0, 1),
  })

  console.log("Limit order 2")
  console.log({
    quoteAmount: new Decimal(quoteAmount).mul(1e18).mul(2).div(3).toFixed(0, 1),
    amountFilled: new Decimal(amountOut).mul(1e18).mul(2).div(3).toFixed(0, 1),
    amountEarned: new Decimal(amountIn).add(fee).mul(1e18).mul(2).div(3).toFixed(0, 1),
    fee: new Decimal(fee).mul(1e18).mul(2).div(3).toFixed(0, 1),
  })
}

const testCreateAndCollectPartiallyFilledAskOrder = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  // Order amount.
  const baseAmount = liquidityToBase(limitToSqrtPrice(OFFSET + 1000, 1), limitToSqrtPrice(OFFSET + 1001, 1), "1500000")

  // Find price reached.
  const netAmount = new Decimal(6).mul(1 - 0.003)
  const nextSqrtPrice = nextSqrtPriceAmountIn(limitToSqrtPrice(OFFSET + 1000, 1), "1500000", netAmount, true)

  const { amountIn, amountOut, fee } = computeSwapAmount(
    limitToSqrtPrice(OFFSET + 1000, 1),
    nextSqrtPrice,
    "1500000",
    "6",
    0.003,
    true
  )
  console.log("Limit order 1")
  console.log({
    baseAmount: new Decimal(baseAmount).mul(1e18).mul(1).div(3).toFixed(0, 1),
    amountFilled: new Decimal(amountOut).mul(1e18).mul(1).div(3).toFixed(0, 1),
    // fees are forfeited if order is partially filled
    amountEarned: new Decimal(amountIn).mul(1e18).mul(1).div(3).toFixed(0, 1),
    fee: new Decimal(fee).mul(1e18).mul(1).div(3).toFixed(0, 1),
  })

  console.log("Limit order 2")
  console.log({
    baseAmount: new Decimal(baseAmount).mul(1e18).mul(2).div(3).toFixed(0, 1),
    amountFilled: new Decimal(amountOut).mul(1e18).mul(2).div(3).toFixed(0, 1),
    // fees are forfeited if order is partially filled
    amountEarned: new Decimal(amountIn).mul(1e18).mul(2).div(3).toFixed(0, 1),
    fee: new Decimal(fee).mul(1e18).mul(2).div(3).toFixed(0, 1),
  })
}

const testPartiallyFilledBidCorrectlyUnfills = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  // Order amount.
  const quoteAmount = liquidityToQuote(limitToSqrtPrice(OFFSET - 1000, 1), limitToSqrtPrice(OFFSET - 999, 1), "1500000")

  // Find price reached after swap 1 (sell)
  let netAmount = new Decimal(6).mul(1 - 0.003)
  const nextSqrtPrice = nextSqrtPriceAmountIn(limitToSqrtPrice(OFFSET - 999, 1), "1500000", netAmount, false)

  const { amountIn, amountOut, fee } = computeSwapAmount(
    limitToSqrtPrice(OFFSET - 999, 1),
    nextSqrtPrice,
    "1500000",
    "6",
    0.003,
    true
  )
  const grossAmountIn = new Decimal(amountIn).add(fee)

  console.log("Swap 1 (sell)")
  console.log({
    quoteAmount: new Decimal(quoteAmount).mul(1e18).toFixed(0, 1),
    amountIn: new Decimal(grossAmountIn).mul(1e18).toFixed(0, 1),
    amountOut: new Decimal(amountOut).mul(1e18).toFixed(0, 1),
  })

  // Find price reached after swap 2 (buy)
  netAmount = new Decimal(4).mul(1 - 0.003)
  const nextSqrtPrice2 = nextSqrtPriceAmountIn(nextSqrtPrice, "1500000", netAmount, true)

  const {
    amountIn: amountIn2,
    amountOut: amountOut2,
    fee: fee2,
  } = computeSwapAmount(nextSqrtPrice, nextSqrtPrice2, "1500000", "4", 0.003, true)

  const grossAmountIn2 = new Decimal(amountIn2).add(fee2)

  console.log("Swap 2 (buy)")
  console.log({
    baseAmount: new Decimal(amountOut2).mul(1e18).toFixed(0, 1),
    quoteAmount: new Decimal(grossAmountIn2).mul(1e18).toFixed(0, 1),
  })
}

const testPartiallyFilledAskCorrectlyUnfills = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  // Order amount.
  const baseAmount = liquidityToBase(limitToSqrtPrice(OFFSET + 1000, 1), limitToSqrtPrice(OFFSET + 1001, 1), "1500000")

  // Find price reached after swap 1 (buy)
  let netAmount = new Decimal(6).mul(1 - 0.003)
  const nextSqrtPrice = nextSqrtPriceAmountIn(limitToSqrtPrice(OFFSET + 1000, 1), "1500000", netAmount, true)

  const { amountIn, amountOut, fee } = computeSwapAmount(
    limitToSqrtPrice(OFFSET + 1000, 1),
    nextSqrtPrice,
    "1500000",
    "6",
    0.003,
    true
  )
  const grossAmountIn = new Decimal(amountIn).add(fee)

  console.log("Swap 1 (buy)")
  console.log({
    baseAmount: new Decimal(baseAmount).mul(1e18).toFixed(0, 1),
    amountIn: new Decimal(grossAmountIn).mul(1e18).toFixed(0, 1),
    amountOut: new Decimal(amountOut).mul(1e18).toFixed(0, 1),
  })

  // Find price reached after swap 2 (sell)
  netAmount = new Decimal(4).mul(1 - 0.003)
  const nextSqrtPrice2 = nextSqrtPriceAmountIn(nextSqrtPrice, "1500000", netAmount, false)

  const {
    amountIn: amountIn2,
    amountOut: amountOut2,
    fee: fee2,
  } = computeSwapAmount(nextSqrtPrice, nextSqrtPrice2, "1500000", "4", 0.003, true)

  const grossAmountIn2 = new Decimal(amountIn2).add(fee2)

  console.log("Swap 2 (sell)")
  console.log({
    baseAmount: new Decimal(grossAmountIn2).mul(1e18).toFixed(0, 1),
    quoteAmount: new Decimal(amountOut2).mul(1e18).toFixed(0, 1),
  })
}

const testLimitOrdersMiscActions = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  // Define sqrt prices.
  const sqrtPriceN1000 = limitToSqrtPrice(OFFSET - 1000, 1)
  const sqrtPriceN999 = limitToSqrtPrice(OFFSET - 999, 1)
  const sqrtPriceN900 = limitToSqrtPrice(OFFSET - 900, 1)
  const sqrtPriceN899 = limitToSqrtPrice(OFFSET - 899, 1)
  const sqrtPrice900 = limitToSqrtPrice(OFFSET + 900, 1)
  const sqrtPrice901 = limitToSqrtPrice(OFFSET + 901, 1)
  const sqrtPrice1000 = limitToSqrtPrice(OFFSET + 1000, 1)
  const sqrtPrice1001 = limitToSqrtPrice(OFFSET + 1001, 1)

  // Swap 1: sell to fill both bid orders at -900 and partially fill one at -1000.
  // Swap leg 1a: swap from -900 to -899
  const {
    amountIn: amountIn1a,
    amountOut: amountOut1a,
    fee: fee1a,
  } = computeSwapAmount(sqrtPriceN899, sqrtPriceN900, "150000", "1", 0.003, true)
  const grossAmountIn1a = new Decimal(amountIn1a).add(fee1a)

  // Swap leg 1b: swap from -999 to -1000
  const netAmount1b = new Decimal(1).sub(grossAmountIn1a).mul(1 - 0.003)
  const nextSqrtPrice1b = nextSqrtPriceAmountIn(limitToSqrtPrice(OFFSET - 999, 1), "200000", netAmount1b, false)
  const {
    amountIn: amountIn1b,
    amountOut: amountOut1b,
    fee: fee1b,
  } = computeSwapAmount(sqrtPriceN999, nextSqrtPrice1b, "200000", new Decimal(1).sub(grossAmountIn1a), 0.003, true)
  const grossAmountIn1b = new Decimal(amountIn1b).add(fee1b)

  // Calculate aggregate swap 1 amounts.
  const grossAmountIn1 = new Decimal(grossAmountIn1a).add(grossAmountIn1b)
  const amountOut1 = new Decimal(amountOut1a).add(amountOut1b)
  const fee1 = new Decimal(fee1a).add(fee1b)

  const baseFeeFactor = new Decimal(fee1a).div(150000).add(new Decimal(fee1b).div(200000))
  const baseFeeFactorN900 = new Decimal(fee1a).div(150000)
  const baseFeeFactorN1000 = new Decimal(fee1b).div(200000)
  console.log({
    baseFeeFactorN900: baseFeeFactorN900.mul(1e18).toFixed(0, 1),
    baseFeeFactorN1000: baseFeeFactorN1000.mul(1e18).toFixed(0, 1),
  })
  const batchNeg1000Quote = liquidityToQuote(sqrtPriceN1000, sqrtPriceN999, "200000").sub(amountOut1b)

  // Calculate reserves and LP balances
  const bidAliceN900QuoteAmt = liquidityToQuote(sqrtPriceN900, sqrtPriceN899, "50000")
  const bidBobN900QuoteAmt = liquidityToQuote(sqrtPriceN900, sqrtPriceN899, "100000")
  const bidAliceN1000QuoteAmt = liquidityToQuote(sqrtPriceN1000, sqrtPriceN999, "200000")
  const askAlice900BaseAmt = liquidityToBase(sqrtPrice900, sqrtPrice901, "150000")
  const askBob900BaseAmt = liquidityToBase(sqrtPrice900, sqrtPrice901, "100000")
  const askAlice1000BaseAmt = liquidityToBase(sqrtPrice1000, sqrtPrice1001, "200000")
  const baseReserves = askAlice900BaseAmt
    .add(askBob900BaseAmt)
    .add(askAlice1000BaseAmt)
    .add(new Decimal(grossAmountIn1a).mul(2).div(3))
    .add(new Decimal(grossAmountIn1b))
  const aliceQuoteSpent = bidAliceN900QuoteAmt.add(bidAliceN1000QuoteAmt)

  console.log("Swap 1: Sell")
  console.log({
    amountIn: new Decimal(grossAmountIn1).mul(1e18).toFixed(0, 1),
    amountOut: new Decimal(amountOut1).mul(1e18).toFixed(0, 1),
    fee: new Decimal(fee1).mul(1e18).toFixed(0, 1),
    baseCollect1a: grossAmountIn1a.mul(1e18).mul(1).div(3).toFixed(0, 1),
    currSqrtPrice1b: nextSqrtPrice1b.mul(1e28).toFixed(0, 1),
    baseFeeFactor: baseFeeFactor.mul(1e28).toFixed(0, 1),
    // remaining order has fees included as it was fully filled
    batchNeg900Base: grossAmountIn1a.mul(1e18).mul(2).div(3).toFixed(0, 1),
    batchNeg1000Base: new Decimal(amountIn1b).add(fee1b).mul(1e18).toFixed(0, 1),
    batchNeg1000Quote: batchNeg1000Quote.mul(1e18).toFixed(0, 1),
    baseReseves: baseReserves.mul(1e18).toFixed(0, 1),
    quoteReseves: batchNeg1000Quote.mul(1e18).toFixed(0, 1),
    aliceQuoteSpent: aliceQuoteSpent.mul(1e18).toFixed(0, 1),
    bobQuoteSpent: bidBobN900QuoteAmt.mul(1e18).toFixed(0, 1),
  })

  // Swap 2: Buy to unfill last bid order and partially fill 2 ask orders.
  // Swap leg 2a: unfill swap back to -999
  const {
    amountIn: amountIn2a,
    amountOut: amountOut2a,
    fee: fee2a,
  } = computeSwapAmount(nextSqrtPrice1b, sqrtPriceN999, "200000", 1, 0.003, true)
  const grossAmountIn2a = new Decimal(amountIn2a).add(fee2a)

  // Swap leg 2b: partially fill 2 ask orders at 900
  const netAmount2a = new Decimal(1).sub(grossAmountIn2a).mul(1 - 0.003)
  const nextSqrtPrice2b = nextSqrtPriceAmountIn(sqrtPrice900, "250000", netAmount2a, true)
  const {
    amountIn: amountIn2b,
    amountOut: amountOut2b,
    fee: fee2b,
  } = computeSwapAmount(sqrtPrice900, nextSqrtPrice2b, "250000", new Decimal(1).sub(grossAmountIn2a), 0.003, true)
  const grossAmountIn2b = new Decimal(amountIn2b).add(fee2b)

  // Calculate aggregate swap 2 amounts.
  const grossAmountIn2 = new Decimal(grossAmountIn2a).add(grossAmountIn2b)
  const amountOut2 = new Decimal(amountOut2a).add(amountOut2b)
  const fee2 = new Decimal(fee2a).add(fee2b)

  const askBob1000BaseAmt = liquidityToBase(sqrtPrice1000, sqrtPrice1001, "200000")
  const quoteFeeFactor = new Decimal(fee2a).div(200000).add(new Decimal(fee2b).div(250000))
  const quoteFeeFactorN899 = new Decimal(fee2a).div(200000)
  const quoteFeeFactorN999 = new Decimal(fee2b).div(250000)
  console.log({
    quoteFeeFactorN899: quoteFeeFactorN899.mul(1e18).toFixed(0, 1),
    quoteFeeFactorN999: quoteFeeFactorN999.mul(1e18).toFixed(0, 1),
  })

  console.log("Swap 2: Buy")
  console.log({
    amountIn: new Decimal(grossAmountIn2).mul(1e18).toFixed(0, 1),
    amountOut: new Decimal(amountOut2).mul(1e18).toFixed(0, 1),
    fee: new Decimal(fee2).mul(1e18).toFixed(0, 1),
    bobCollect900BaseAmt: askBob900BaseAmt.sub(new Decimal(amountOut2b).mul(2).div(5)).mul(1e18).toFixed(0, 1),
    bobCollect900QuoteAmt: new Decimal(amountIn2b).add(fee2b).mul(2).div(5).mul(1e18).toFixed(0, 1),
    askBob1000BaseAmt: askBob1000BaseAmt.mul(1e18).toFixed(0, 1),
    nextSqrtPrice2b: nextSqrtPrice2b.mul(1e28).toFixed(0, 1),
    baseFeeFactor: baseFeeFactor.mul(1e28).toFixed(0, 1),
    quoteFeeFactor: quoteFeeFactor.mul(1e28).toFixed(0, 1),
    batch900BaseAmt: askAlice900BaseAmt.sub(new Decimal(amountOut2b).mul(3).div(5)).mul(1e18).toFixed(0, 1),
    batch900QuoteAmt: new Decimal(amountIn2b).add(fee2b).mul(3).div(5).mul(1e18).toFixed(0, 1),
  })
}

// testCreateMultipleBidOrders()
// testCreateMultipleAskOrders()
// testSwapFullyFillsBidLimitOrders()
// testSwapFullyFillsAskLimitOrders()
// testCreateAndCollectUnfilledBidOrder()
// testCreateAndCollectUnfilledAskOrder()
// testCreateAndCollectFullyFilledBidOrder()
// testCreateAndCollectFullyFilledAskOrder()
// testCreateAndCollectPartiallyFilledBidOrder()
// testCreateAndCollectPartiallyFilledAskOrder()
// testPartiallyFilledBidCorrectlyUnfills()
// testPartiallyFilledAskCorrectlyUnfills()
testLimitOrdersMiscActions()
