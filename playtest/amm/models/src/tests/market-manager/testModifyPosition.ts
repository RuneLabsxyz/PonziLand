import Decimal from "decimal.js"
import { liquidityToAmounts } from "../../math/liquidityMath"
import { limitToSqrtPrice, shiftLimit } from "../../math/priceMath"
import { MAX_LIMIT } from "../../constants"
import { PRECISION, ROUNDING } from "../../config"

type TestCase = {
  lowerLimit: number
  upperLimit: number
  liquidity: string
}

const printPositionAmounts = (cases: Array<TestCase>) => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  for (const { lowerLimit, upperLimit, liquidity } of cases) {
    const currLimit = -230260
    const width = 1
    const currSqrtPrice = limitToSqrtPrice(shiftLimit(currLimit, width), width)

    const isRemove = liquidity.startsWith("-")
    const { baseAmount, quoteAmount } = liquidityToAmounts(
      liquidity,
      currSqrtPrice,
      limitToSqrtPrice(shiftLimit(lowerLimit, width), width),
      limitToSqrtPrice(shiftLimit(upperLimit, width), width)
    )

    console.log({
      baseAmount: new Decimal(baseAmount).toFixed(0, isRemove ? 1 : 0),
      quoteAmount: new Decimal(quoteAmount).toFixed(0, isRemove ? 1 : 0),
    })
  }
}

const testModifyPositionAboveCurrPrice = () => {
  const cases: Array<TestCase> = [
    {
      lowerLimit: -229760,
      upperLimit: 0,
      liquidity: "10000",
    },
    {
      lowerLimit: -229760,
      upperLimit: -123000,
      liquidity: "10000",
    },
    {
      lowerLimit: MAX_LIMIT - 1,
      upperLimit: MAX_LIMIT,
      liquidity: "100000000000000000000000000000",
    },
    {
      lowerLimit: -229760,
      upperLimit: 0,
      liquidity: "-5000",
    },
    {
      lowerLimit: -229760,
      upperLimit: -123000,
      liquidity: "-10000",
    },
  ]

  printPositionAmounts(cases)
}

const testModifyPositionWrapsCurrPrice = () => {
  const cases: Array<TestCase> = [
    {
      lowerLimit: -236000,
      upperLimit: -224000,
      liquidity: "50000",
    },
    {
      lowerLimit: -7906625,
      upperLimit: 7906625,
      liquidity: "50000",
    },
    {
      lowerLimit: -7906625,
      upperLimit: 7906625,
      liquidity: "-50000",
    },
  ]

  printPositionAmounts(cases)
}

const testModifyPositionBelowCurrPrice = () => {
  const cases: Array<TestCase> = [
    {
      lowerLimit: -460000,
      upperLimit: -235000,
      liquidity: "20000",
    },
    {
      lowerLimit: -460000,
      upperLimit: -235000,
      liquidity: "15000",
    },
    {
      lowerLimit: -7906625,
      upperLimit: -7906624,
      liquidity: "100000000000000000000000000000",
    },
    {
      lowerLimit: -460000,
      upperLimit: -235000,
      liquidity: "-35000",
    },
    {
      lowerLimit: -7906625,
      upperLimit: -7906624,
      liquidity: "-40000000000000000000000000000",
    },
  ]

  printPositionAmounts(cases)
}

// testModifyPositionAboveCurrPrice()
// testModifyPositionWrapsCurrPrice()
testModifyPositionBelowCurrPrice()
