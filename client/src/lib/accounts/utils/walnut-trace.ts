import { padAddress, toHexWithPadding } from '$lib/utils';
import {
  Account,
  AccountInterface,
  CallData,
  selector,
  WalletAccount,
  type Call,
} from 'starknet';

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

export function trace<T extends (...args: any[]) => Promise<any>>(
  originalFunction: T,
): T {
  return new Proxy(originalFunction, {
    apply(target, thisArg, args) {
      if (target.name === 'execute') {
        // Execute
        console.log(
          'Executing with calldata: \n',
          generateWalnutCallData(args[0] as Call[] | Call),
        );
      } else {
        console.log('Calling function:', target.name, 'with arguments:', args);
      }
      // Important - don't forget the return statement or else the function's
      // return value is lost!
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
