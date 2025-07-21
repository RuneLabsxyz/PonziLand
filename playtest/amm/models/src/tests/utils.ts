import Decimal from "decimal.js";

export const round = (x: Decimal.Value, roundUp: boolean = false) => {
  return new Decimal(x).toDP(0, roundUp ? 0 : 1).toFixed();
};

export const add = (x: Decimal.Value, y: Decimal.Value) => {
  return new Decimal(x).add(y).toFixed();
};

export const sub = (x: Decimal.Value, y: Decimal.Value) => {
  return new Decimal(x).sub(y).toFixed();
};
