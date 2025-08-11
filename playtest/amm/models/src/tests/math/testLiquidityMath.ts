import { PRECISION, ROUNDING } from "../../config"
import { liquidityToAmounts, liquidityToBase, liquidityToQuote } from "../../math/liquidityMath"
import Decimal from "decimal.js"
import crypto from "crypto"
import { limitToSqrtPrice, shiftLimit } from "../../math/priceMath"
import { OFFSET } from "../../constants"

type TestCase = {
  liquidity: Decimal.Value
  lowerSqrtPrice: Decimal.Value
  upperSqrtPrice: Decimal.Value
  base: Decimal.Value
  quote: Decimal.Value
}

const genValue = (min: number, max: number) => {
  return crypto.randomInt(min, max)
}

const generateTestCases = (num: number) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  let cases: TestCase[] = []

  for (let i = 0; i < num; i++) {
    // Categories: 0 = small, 1 = medium, 2 = large
    const liqCategory = genValue(0, 3)
    const priceCategory = genValue(0, 3)

    const liquidity = new Decimal(genValue(0, 281474976710656)).mul(
      liqCategory === 0 ? 1e-30 : liqCategory === 1 ? 1e-10 : 1e40
    )
    const sqrtPrice1 = new Decimal(genValue(0, 281474976710656)).mul(
      priceCategory === 0 ? 1e-30 : priceCategory === 1 ? 1e-10 : 1e40
    )
    const sqrtPrice2 = new Decimal(genValue(0, 281474976710656)).mul(
      priceCategory === 0 ? 1e-30 : priceCategory === 1 ? 1e-10 : 1e40
    )

    const lowerSqrtPrice = (sqrtPrice1.lt(sqrtPrice2) ? sqrtPrice1 : sqrtPrice2).toFixed(28, 1)
    const upperSqrtPrice = (sqrtPrice1.gt(sqrtPrice2) ? sqrtPrice1 : sqrtPrice2).toFixed(28, 1)

    const quote = liquidityToQuote(lowerSqrtPrice, upperSqrtPrice, liquidity)
    const base = liquidityToBase(lowerSqrtPrice, upperSqrtPrice, liquidity)

    cases.push({
      liquidity: liquidity.toFixed(28, 1),
      lowerSqrtPrice,
      upperSqrtPrice,
      base: base.toFixed(28, 1),
      quote: quote.toFixed(28, 1),
    })
  }

  return cases
}

const testCases = () => {
  const cases = [
    {
      lowerSqrtPrice: new Decimal(1),
      upperSqrtPrice: new Decimal(2).sqrt(),
      liquidity: "0",
    },
    {
      lowerSqrtPrice: new Decimal(1),
      upperSqrtPrice: new Decimal(1),
      liquidity: "2",
    },
    {
      lowerSqrtPrice: new Decimal(0.5).sqrt(),
      upperSqrtPrice: new Decimal(25).sqrt(),
      liquidity: new Decimal(100),
    },
    {
      lowerSqrtPrice: new Decimal(1685).sqrt(),
      upperSqrtPrice: new Decimal(2015).sqrt(),
      liquidity: new Decimal(33),
    },
    // adding randomly generated cases below
    {
      lowerSqrtPrice: "12163.9496252071918121639496252071",
      upperSqrtPrice: "23333.7802229883332333378022298108",
      liquidity: "0.0000000000000002676354190899",
    },
    {
      lowerSqrtPrice: "7371.5557888566391711047589037374",
      upperSqrtPrice: "23017.1892267239274781237123710089",
      liquidity: "7885.3949886612102384123699749718",
    },
    {
      lowerSqrtPrice: "82237224508681000000000000000000000000000000",
      upperSqrtPrice: "180290854283707000000000000000000000000000000",
      liquidity: "0.0000000000000001349167646237",
    },
    {
      lowerSqrtPrice: "4204.5765511869000000000000000000",
      upperSqrtPrice: "18313.1552704515000000000000000000",
      liquidity: "47451815934873654611138917239890127409579.12310152310",
    },
  ]
  return cases
}

const liquidityToAmountsCases = () => {
  const cases = [
    {
      liquidity: new Decimal("10000").div(1e28),
      currSqrtPrice: limitToSqrtPrice(OFFSET + 80000, 1),
      lowerSqrtPrice: limitToSqrtPrice(OFFSET + 85000, 1),
      upperSqrtPrice: limitToSqrtPrice(OFFSET + 90000, 1),
      width: 1,
    },
    {
      liquidity: new Decimal("10000").div(1e28),
      currSqrtPrice: limitToSqrtPrice(OFFSET + 80000, 1),
      lowerSqrtPrice: limitToSqrtPrice(OFFSET + 70000, 1),
      upperSqrtPrice: limitToSqrtPrice(OFFSET + 75000, 1),
      width: 1,
    },
    {
      liquidity: new Decimal("10000").div(1e28),
      currSqrtPrice: limitToSqrtPrice(OFFSET + 80000, 1),
      lowerSqrtPrice: limitToSqrtPrice(OFFSET + 75000, 1),
      upperSqrtPrice: limitToSqrtPrice(OFFSET + 85000, 1),
      width: 1,
    },
  ]
  return cases
}

const testLiquidityToQuote = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  for (const { liquidity, lowerSqrtPrice, upperSqrtPrice } of testCases()) {
    const quote = liquidityToQuote(lowerSqrtPrice, upperSqrtPrice, liquidity)
    console.log(`l->q(${lowerSqrtPrice} - ${upperSqrtPrice}, ${liquidity})`, quote.toFixed(28, 0))
  }
}

const testLiquidityToBase = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  for (const { liquidity, lowerSqrtPrice, upperSqrtPrice } of testCases()) {
    const base = liquidityToBase(lowerSqrtPrice, upperSqrtPrice, liquidity)
    console.log(`l->b(${lowerSqrtPrice} - ${upperSqrtPrice}, ${liquidity})`, base.toFixed(28, 0))
  }
}

const testLiquidityToAmounts = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })

  for (const { liquidity, currSqrtPrice, lowerSqrtPrice, upperSqrtPrice, width } of liquidityToAmountsCases()) {
    const { baseAmount, quoteAmount } = liquidityToAmounts(liquidity, currSqrtPrice, lowerSqrtPrice, upperSqrtPrice)
    console.log({
      baseAmount: new Decimal(baseAmount).toFixed(28, 0),
      quoteAmount: new Decimal(quoteAmount).toFixed(28, 0),
    })
  }
}

// console.log(generateTestCases(5))
// testLiquidityToQuote()
// testLiquidityToBase()
testLiquidityToAmounts()
