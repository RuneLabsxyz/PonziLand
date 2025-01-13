import { ABI as BLUEAbi } from '$lib/abi/blueAbi';
import { ABI as GREENAbi } from '$lib/abi/greenAbi';
import { ABI as REDAbi } from '$lib/abi/redAbi';
import { dojoConfig } from '$lib/dojoConfig';
import { DojoProvider } from '@dojoengine/core';
import { Contract, type TypedContractV2 } from 'starknet';

export const fetchREDBalance = async (account_address: string) => {
  const REDAddress =
    '0x06450580d0d5cd36f0107227091ca68a237fd0ab538ae59ea43868f660bc2c30';

  const dojoProvider = new DojoProvider(dojoConfig.manifest, dojoConfig.rpcUrl);

  const contract: TypedContractV2<typeof REDAbi> = new Contract(
    REDAbi,
    REDAddress,
    dojoProvider.provider,
  ).typedv2(REDAbi);

  const balance = await contract.balanceOf(account_address);

  console.log('RED:', balance);
  return balance;
};

export const fetchGREENBalance = async (account_address: string) => {
  const GREENAddress =
    '0x04ed678da6c0534e8ba7a1e7db81f3ecc0f1c2628094094b5123c481cd13461f';
  const dojoProvider = new DojoProvider(dojoConfig.manifest, dojoConfig.rpcUrl);

  const contract: TypedContractV2<typeof GREENAbi> = new Contract(
    GREENAbi,
    GREENAddress,
    dojoProvider.provider,
  ).typedv2(GREENAbi);

  const balance = await contract.balanceOf(account_address);

  console.log('GREEN:', balance);
  return balance;
};

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
