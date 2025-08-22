import { padAddress, toHexWithPadding } from '$lib/utils';
import { CallData, selector, WalletAccount, type Call } from 'starknet';

function generateWalnutCallData(data: Call[] | Call) {
  let calls: Call[];

  if (!Array.isArray(data)) {
    calls = [data];
  } else {
    calls = data;
  }

  const flattenedCalls = calls.flatMap((call) => {
    const callData = CallData.toHex(call.calldata) ?? [];
    return [
      padAddress(call.contractAddress.toString()),
      selector.getSelectorFromName(call.entrypoint),
      toHexWithPadding(callData.length),
      ...callData,
    ];
  });

  return [toHexWithPadding(calls.length), ...flattenedCalls].join('\n');
}

// Red: No possibility to exclude this one.
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function trace<T extends Function>(originalFunction: T): T {
  return new Proxy(originalFunction, {
    apply(target, thisArg, args) {
      if (target.name === 'execute') {
        console.log(
          'Executing with calldata: \n',
          generateWalnutCallData(args[0] as Call[] | Call),
        );
      } else {
        console.log('Calling function:', target.name, 'with arguments:', args);
      }
      return target.apply(thisArg, args);
    },
  });
}

export function traceWallet(
  wallet: WalletAccount | undefined,
): WalletAccount | undefined {
  if (wallet == undefined) {
    return undefined;
  }

  return Object.assign(wallet, {
    execute: trace(wallet.execute),
  });
}
