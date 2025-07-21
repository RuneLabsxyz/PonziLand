import { calcFee, getFeeInside, grossToNet, netToFee, netToGross } from "../../math/feeMath"
import { round } from "../utils"

const testCalcFee = () => {
  const cases = [
    { grossAmount: 0, feeRate: 0 },
    { grossAmount: 1, feeRate: 0 },
    { grossAmount: 0, feeRate: 0.00001 },
    { grossAmount: 1, feeRate: 0.1 },
    { grossAmount: 3749, feeRate: 0.0241 },
    { grossAmount: 100000, feeRate: 0.01 },
    { grossAmount: "115792089237316195423570985008687907853269984665640564039457584007913129639936", feeRate: 0.3333 },
    { grossAmount: "115792089237316195423570985008687907853269984665640564039457584007913129639936", feeRate: 1 },
  ]

  for (const { grossAmount, feeRate } of cases) {
    const fee = round(calcFee(grossAmount, feeRate), true)
    console.log(`calc_fee(${grossAmount}, ${feeRate})`, fee)
  }
}

const testGrossToNet = () => {
  const cases = [
    { grossAmount: 0, feeRate: 0 },
    { grossAmount: 5500, feeRate: 0 },
    { grossAmount: 0, feeRate: 0.5 },
    { grossAmount: 5500, feeRate: 0.1 },
    { grossAmount: 37490, feeRate: 0.0241 },
    { grossAmount: 100000, feeRate: 0.01 },
    { grossAmount: "115792089237316195423570985008687907853269984665640564039457584007913129639936", feeRate: 0.3333 },
    { grossAmount: "115792089237316195423570985008687907853269984665640564039457584007913129639936", feeRate: 1 },
  ]

  for (const { grossAmount, feeRate } of cases) {
    const netAmount = round(grossToNet(grossAmount, feeRate))
    console.log(`gross_to_net(${grossAmount}, ${feeRate})`, netAmount)
  }
}

const testNetToGross = () => {
  const cases = [
    { netAmount: 0, feeRate: 0 },
    { netAmount: 5500, feeRate: 0 },
    { netAmount: 0, feeRate: 0.5 },
    { netAmount: 5500, feeRate: 0.1 },
    { netAmount: 37490, feeRate: 0.0241 },
    { netAmount: 100000, feeRate: 0.01 },
    { netAmount: "104212880313584575881213886507819117067942986199076507635511825607121816675942", feeRate: 0.1 },
    { netAmount: "115792089237316195423570985008687907853269984665640564039457584007913129639936", feeRate: 0 },
  ]

  for (const { netAmount, feeRate } of cases) {
    const grossAmount = round(netToGross(netAmount, feeRate))
    console.log(`net_to_gross(${netAmount}, ${feeRate})`, grossAmount)
  }
}

const testNetToFee = () => {
  const cases = [
    { netAmount: 0, feeRate: 0 },
    { netAmount: 5500, feeRate: 0 },
    { netAmount: 0, feeRate: 0.5 },
    { netAmount: 5500, feeRate: 0.1 },
    { netAmount: 37490, feeRate: 0.0241 },
    { netAmount: 100000, feeRate: 0.01 },
    { netAmount: "104212880313584575881213886507819117067942986199076507635511825607121816675942", feeRate: 0.1 },
    { netAmount: "38593503342797487934676209303395679687494885889057999994351212749837446108990", feeRate: 0.3333 },
  ]

  for (const { netAmount, feeRate } of cases) {
    const fee = round(netToFee(netAmount, feeRate))
    console.log(`net_to_fee(${netAmount}, ${feeRate})`, fee)
  }
}

const testGetFeeInside = () => {
  const cases = [
    {
      lowerBff: 0,
      lowerQff: 0,
      upperBff: 0,
      upperQff: 0,
      lowerLimit: 0,
      upperLimit: 10,
      currLimit: 15,
      bff: 100,
      qff: 200,
    },
    {
      lowerBff: 0,
      lowerQff: 0,
      upperBff: 0,
      upperQff: 0,
      lowerLimit: 5,
      upperLimit: 10,
      currLimit: 0,
      bff: 100,
      qff: 200,
    },
    {
      lowerBff: 0,
      lowerQff: 0,
      upperBff: 0,
      upperQff: 0,
      lowerLimit: 0,
      upperLimit: 10,
      currLimit: 5,
      bff: 100,
      qff: 200,
    },
    {
      lowerBff: 0,
      lowerQff: 0,
      upperBff: 25,
      upperQff: 50,
      lowerLimit: 0,
      upperLimit: 10,
      currLimit: 5,
      bff: 100,
      qff: 200,
    },
    {
      lowerBff: 12,
      lowerQff: 24,
      upperBff: 0,
      upperQff: 0,
      lowerLimit: 0,
      upperLimit: 10,
      currLimit: 5,
      bff: 100,
      qff: 200,
    },
    {
      lowerBff: 12,
      lowerQff: 24,
      upperBff: 25,
      upperQff: 50,
      lowerLimit: 0,
      upperLimit: 10,
      currLimit: 5,
      bff: 100,
      qff: 200,
    },
  ]

  for (const { lowerBff, lowerQff, upperBff, upperQff, lowerLimit, upperLimit, currLimit, bff, qff } of cases) {
    const { baseFeeFactor, quoteFeeFactor } = getFeeInside(
      lowerBff,
      lowerQff,
      upperBff,
      upperQff,
      lowerLimit,
      upperLimit,
      currLimit,
      bff,
      qff
    )
    console.log(
      `gfi(${lowerBff}, ${lowerQff}, ${upperBff}, ${upperQff}, ${lowerLimit}, ${upperLimit}, ${currLimit}, ${bff}, ${qff})`,
      { baseFeeFactor, quoteFeeFactor }
    )
  }
}

// Run tests.
testCalcFee()
testGrossToNet()
testGetFeeInside()
testNetToGross()
testNetToFee()
