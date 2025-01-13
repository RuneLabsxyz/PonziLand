import { setupWorld } from '$lib/contracts.gen';
import {
  DojoProvider,
  getContractByName,
  type DojoCall,
} from '@dojoengine/core';
import {
  cairo,
  CallData,
  type Account,
  type AccountInterface,
  type BigNumberish,
  type Call,
} from 'starknet';

export type ApprovalData = {
  tokenAddress: string;
  amount: BigNumberish;
};

async function getApprove(
  provider: DojoProvider,
  data: ApprovalData,
  spendingCall: DojoCall | Call,
  namespace: string = 'ponzi_land',
): Promise<[Call, DojoCall | Call]> {
  let spendingContract;

  if ('contractName' in spendingCall) {
    spendingContract = getContractByName(
      provider.manifest,
      namespace,
      spendingCall.contractName,
    )!.address as string;
  } else {
    spendingContract = spendingCall.contractAddress;
  }

  console.log(spendingContract);
  console.dir(data);

  const decimals = (await provider.call('ponzi_land', {
    contractAddress: data.tokenAddress,
    entrypoint: 'decimals',
    calldata: CallData.compile({}),
  })) as unknown as number;

  return [
    {
      contractAddress: data.tokenAddress,
      entrypoint: 'approve',
      calldata: CallData.compile({
        spender: spendingContract,
        amount: cairo.uint256(data.amount),
      }),
    },
    spendingCall,
  ];
}

export async function wrappedActions(provider: DojoProvider) {
  const actions_bid = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
    liquidityPool: string,
  ) => {
    return await provider.execute(
      snAccount,
      await getApprove(
        provider,
        {
          tokenAddress: tokenForSale,
          amount: amountToStake,
        },
        {
          contractName: 'actions',
          entrypoint: 'bid',
          calldata: [
            landLocation,
            tokenForSale,
            sellPrice,
            amountToStake,
            liquidityPool,
          ],
        },
      ),
      'ponzi_land',
    );
  };

  const actions_buy = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
    liquidityPool: string,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        await getApprove(
          provider,
          {
            tokenAddress: tokenForSale,
            amount: amountToStake,
          },
          {
            contractName: 'actions',
            entrypoint: 'buy',
            calldata: [
              landLocation,
              tokenForSale,
              sellPrice,
              amountToStake,
              liquidityPool,
            ],
          },
        ),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
    }
  };

  const actions_increaseStake = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    stakingToken: string,
    amountToStake: BigNumberish,
  ) => {
    try {
      return await provider.execute(
        snAccount,
        await getApprove(
          provider,
          {
            tokenAddress: stakingToken,
            amount: amountToStake,
          },
          {
            contractName: 'actions',
            entrypoint: 'increase_stake',
            calldata: [landLocation, amountToStake],
          },
        ),
        'ponzi_land',
      );
    } catch (error) {
      console.error(error);
    }
  };

  return {
    actions: {
      ...(await setupWorld(provider)).actions,
      // Add the wrapped calls with multicalls
      bid: actions_bid,
      buy: actions_buy,
      increaseStake: actions_increaseStake,
    },
  };
}
