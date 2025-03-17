import { setupWorld } from '$lib/contracts.gen';
import type { PoolKey } from '$lib/models.gen';
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
  type AllowArray,
  type BigNumberish,
  type Call,
} from 'starknet';

export type ApprovalData = {
  tokenAddress: string;
  amount: BigNumberish;
};

async function getApprove(
  provider: DojoProvider,
  data: ApprovalData[],
  spendingCall: DojoCall | Call,
  namespace: string = 'ponzi_land',
): Promise<AllowArray<DojoCall | Call>> {
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

  const approvals = data.map((data) => {
    return {
      contractAddress: data.tokenAddress,
      entrypoint: 'approve',
      calldata: CallData.compile({
        spender: spendingContract,
        amount: cairo.uint256(data.amount),
      }),
    };
  });

  console.log('spending call', spendingCall);

  return [...approvals, spendingCall];
}

export async function wrappedActions(provider: DojoProvider) {
  const world = setupWorld(provider);

  const actions_bid = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
    liquidityPool: PoolKey,
    /* Added parameters required for approval */
    buyingToken: string,
    currentPrice: BigNumberish,
  ) => {
    const approvals =
      buyingToken == tokenForSale
        ? [
            {
              tokenAddress: tokenForSale,
              amount: BigInt(amountToStake) + BigInt(currentPrice),
            },
          ]
        : [
            {
              tokenAddress: tokenForSale,
              amount: BigInt(amountToStake),
            },
            {
              tokenAddress: buyingToken,
              amount: BigInt(currentPrice),
            },
          ];

    const calls = await getApprove(
      provider,
      approvals,
      world.actions.buildBidCalldata(
        landLocation,
        tokenForSale,
        sellPrice,
        amountToStake,
        liquidityPool,
      ),
    );

    return await provider.execute(snAccount, calls, 'ponzi_land');
  };

  const actions_buy = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,

    liquidityPool: PoolKey,

    /* Added arguments for approval */
    currentToken: string,
    buyPrice: BigNumberish,
  ) => {
    const approvals =
      currentToken == tokenForSale
        ? [
            {
              tokenAddress: tokenForSale,
              amount: BigInt(amountToStake) + BigInt(buyPrice),
            },
          ]
        : [
            {
              tokenAddress: tokenForSale,
              amount: BigInt(amountToStake),
            },
            {
              tokenAddress: currentToken,
              amount: BigInt(buyPrice),
            },
          ];

    try {
      const calls = await getApprove(
        provider,
        approvals,
        world.actions.buildBuyCalldata(
          landLocation,
          tokenForSale,
          sellPrice,
          amountToStake,
          liquidityPool,
        ),
      );

      return await provider.execute(snAccount, calls, 'ponzi_land');
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
      const calls = await getApprove(
        provider,
        [
          {
            tokenAddress: stakingToken,
            amount: BigInt(amountToStake),
          },
        ],
        world.actions.buildIncreaseStakeCalldata(landLocation, amountToStake),
      );

      return await provider.execute(snAccount, calls, 'ponzi_land');
    } catch (error) {
      console.error(error);
    }
  };

  return {
    actions: {
      ...world.actions,
      // Add the wrapped calls with multicalls
      bid: actions_bid,
      buy: actions_buy,
      increaseStake: actions_increaseStake,
    },
  };
}
