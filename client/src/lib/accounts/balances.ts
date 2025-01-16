import { DojoProvider } from '@dojoengine/core';
import { Account, AccountInterface, type Result } from 'starknet';

export const fetchTokenBalance = async (
  address: string,
  snAccount: Account | AccountInterface,
  provider: DojoProvider,
) => {
  return await provider
    .call('ponzi_land', {
      contractAddress: address,
      entrypoint: 'balanceOf',
      calldata: [snAccount.address],
    })
    .then((res: Result) => {
      // Ensure the result array is not empty and contains valid hex values
      if (Array.isArray(res) && res.length > 0) {
        const hexBalance = res[0]; // The first value in the result array
        console.log('Hex Balance:', hexBalance);

        // Convert the hex value to a decimal number
        const balanceDecimal = BigInt(hexBalance);
        console.log('Decimal Balance:', balanceDecimal);

        return balanceDecimal; // Return the decimal balance as a BigInt
      } else {
        console.error('Invalid response format:', res);
        return null;
      }
    });
};
