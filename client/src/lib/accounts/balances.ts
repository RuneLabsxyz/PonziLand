import { useDojo } from '$lib/contexts/dojo';
import { dojoConfig } from '$lib/dojoConfig';
import { DojoProvider } from '@dojoengine/core';
import { Contract, type TypedContractV2 } from 'starknet';
import { ABI as BLUEAbi } from '$lib/abi/blueAbi';

export const fetchBLUEBalance = async (account_address: string) => {
  const BLUEAddress =
    '0x01853f03f808ae62dfbd8b8a4de08e2052388c40b9f91d626090de04bbc1f619';
  const dojoProvider = new DojoProvider(dojoConfig.manifest, dojoConfig.rpcUrl);

  const contract: TypedContractV2<typeof BLUEAbi> = new Contract(
    BLUEAbi,
    BLUEAddress,
    dojoProvider.provider,
  ).typedv2(BLUEAbi);

  const balance = await contract.balanceOf(account_address);

  console.log('BLUE:', balance);
  return balance;
};
