import { DojoProvider } from '@dojoengine/core';
import { Account, AccountInterface} from 'starknet';

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
    .then((res: any) => {
      // Ensure the result array is not empty and contains valid hex values
      if (Array.isArray(res) && res.length > 0) {
        const hexBalance = res[0];

        const balanceDecimal = BigInt(hexBalance);

        return balanceDecimal;
      } else {
        console.error('Invalid response format:', res);
        return null;
      }
    });
};
