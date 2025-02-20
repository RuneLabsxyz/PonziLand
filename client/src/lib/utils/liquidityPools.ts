import type { Token } from '$lib/interfaces';
import type { PoolKey } from '$lib/models.gen';
import data from '$lib/data.json';
import { toBigInt } from '$lib/utils';

const mainCurrency = data.availableTokens.find(
  (token) => token.symbol == data.mainCurrency,
)!;

export function getLiquidityPoolFromToken(token: Token): PoolKey {
  // Sort them from smallest to largest
  const tokens = [mainCurrency?.address, token.address].sort((a, b) =>
    Number(toBigInt(a)! - toBigInt(b)!),
  );

  const liquidityPoolType =
    token.liquidityPoolType as keyof typeof data.ekuboPositionType;

  const ekuboParameters = data.ekuboPositionType[liquidityPoolType]!;

  const result = {
    token0: tokens[0],
    token1: tokens[1],
    fee: ekuboParameters.fee,
    tick_spacing: ekuboParameters.tickSpacing,
    // We are not using the extension.
    extension: '0x0',
  };
  console.log('Data: ', result);

  return result;
}
