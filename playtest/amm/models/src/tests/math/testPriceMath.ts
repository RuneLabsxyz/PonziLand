import Decimal from "decimal.js"
import { MAX_LIMIT, MAX_SQRT_PRICE, MIN_LIMIT, MIN_SQRT_PRICE, OFFSET } from "../../constants"
import { limitToSqrtPrice, offset, priceToLimit, sqrtPriceToLimit } from "../../math/priceMath"
import { PRECISION, ROUNDING } from "../../config"

const testLimitToSqrtPriceWidth1 = () => {
  const cases = [
    OFFSET + MIN_LIMIT,
    OFFSET + MIN_LIMIT + 1,
    OFFSET - 1150000,
    OFFSET - 950000,
    OFFSET - 250000,
    OFFSET - 47500,
    OFFSET - 22484,
    OFFSET - 9999,
    OFFSET - 1872,
    OFFSET - 396,
    OFFSET - 50,
    OFFSET - 1,
    OFFSET,
    OFFSET + 1,
    OFFSET + 25,
    OFFSET + 450,
    OFFSET + 2719,
    OFFSET + 14999,
    OFFSET + 55000,
    OFFSET + 249000,
    OFFSET + 888000,
    OFFSET + 1350000,
    OFFSET + 4500000,
    OFFSET + 5500000,
    OFFSET + 6500000,
    OFFSET + 7500000,
    OFFSET + MAX_LIMIT - 1,
    OFFSET + MAX_LIMIT,
  ]

  for (const limit of cases) {
    const sqrtPrice = new Decimal(limitToSqrtPrice(limit, 1)).mul(1e28).toFixed(0, 0)
    console.log(`limit: ${limit - OFFSET}, sqrtPrice: ${sqrtPrice}`)
  }
}

const testLimitToSqrtPriceWidthGt1 = () => {
  const cases = [
    { limit: Number(offset(20)) - 7906620, width: 20 },
    { limit: Number(offset(2)) - 250000, width: 2 },
    { limit: Number(offset(5)) - 50, width: 5 },
    { limit: Number(offset(24)) - 1, width: 24 },
    { limit: Number(offset(5500)) - 0, width: 5500 },
    { limit: Number(offset(10000)) + 1, width: 10000 },
    { limit: Number(offset(4)) + 55000, width: 4 },
    { limit: Number(offset(25)) + 7906625, width: 25 },
  ]

  for (const { limit, width } of cases) {
    const sqrtPrice = new Decimal(limitToSqrtPrice(limit, width)).mul(1e28).toFixed(0, 0)
    console.log(`limit: ${limit - OFFSET}, width: ${width} sqrtPrice: ${sqrtPrice}`)
  }
}

const testSqrtPriceToLimitWidth1 = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const cases = [
    MIN_SQRT_PRICE,
    "67775070201",
    "31828723021629170035251312",
    "86519006819519020213519911",
    "2865065875088286000374254002",
    "7885978274341976831474794041",
    "8936693400839181505195305981",
    "9512344184429357105567813281",
    "9906837148119240093576097895",
    "9980219687872597169568506614",
    "9997500324970752047381250938",
    "9999950000374996875027343504",
    "10000000000000000000000000000",
    "10000049999875000624996093778",
    "10001250071877515684747109447",
    "10022525218742400856832334477",
    "10136877633151767879083939822",
    "10778783573025323312733842362",
    "13165288646512563030484384832",
    "34729131805291136927238747986",
    "847730597035592474894705542056",
    "8540299387214792726855084583850",
    "59098571711246800030041333323272877718",
    "8770786455175854494079784255897072914655",
    "1301667583747318151082988967463051234466449",
    "193179768682968120670626619759297849997312135",
    "1475468777891786697833509843618285689088340037",
    MAX_SQRT_PRICE,
  ]

  // These don't yield the correct limits. Use https://keisan.casio.jp/calculator instead.
  // e.g. rounddown(log(8936693400839181505195305981/10^28)/log(1.00001)*2, 0) = -22484
  for (const sqrtPrice of cases) {
    const limit = new Decimal(sqrtPriceToLimit(new Decimal(sqrtPrice).div(1e28), 1)).toFixed(0, 1)
    console.log(`sqrtPrice: ${sqrtPrice}, limit: ${Number(limit) - OFFSET}`)
  }
}

const testSqrtPriceToLimitWidthGt1 = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const cases = [
    { sqrtPrice: "67776425709", width: 20 },
    { sqrtPrice: "2865065875088286000374254002", width: 2 },
    { sqrtPrice: "9997500324970752047381250938", width: 5 },
    { sqrtPrice: "9999950000374996875027343504", width: 24 },
    { sqrtPrice: "10000000000000000000000000000", width: 5500 },
    { sqrtPrice: "10000049999875000624996093778", width: 10000 },
    { sqrtPrice: "13165288646512563030484384832", width: 4 },
    { sqrtPrice: "847730597035592474894705542056", width: 10 },
    { sqrtPrice: "1475468777891786697833509843618285689088340037", width: 25 },
    { sqrtPrice: "1475291733146559100490057806901054223599512637", width: 40 },
  ]

  for (const { sqrtPrice, width } of cases) {
    const limit = new Decimal(sqrtPriceToLimit(new Decimal(sqrtPrice).div(1e28), width)).toFixed(0, 1)
    console.log(`sqrtPrice: ${sqrtPrice}, limit: ${Number(limit) - OFFSET}`)
  }
}

const testPriceToLimit = () => {
  Decimal.set({ precision: PRECISION, rounding: ROUNDING })
  const cases = [
    { price: "1", width: 1 },
    { price: "823185190241736438", width: 4 },
    { price: "9999950000374996875027343504", width: 20 },
    { price: "10000000000000000000000000000", width: 100 },
    { price: "4873111937056930770242496363471129837", width: 66 },
    { price: "1647812259929876135679834711867148424422577661217622160914", width: 25 },
  ]

  for (const { price, width } of cases) {
    const limit = new Decimal(priceToLimit(new Decimal(price).div(1e28), width))
    console.log(`price: ${price}, limit: ${Number(limit)}, limit (unshft): ${Number(limit) - Number(offset(width))}`)
  }
}

testLimitToSqrtPriceWidth1()
testLimitToSqrtPriceWidthGt1()
testSqrtPriceToLimitWidth1()
testSqrtPriceToLimitWidthGt1()
testPriceToLimit()
