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
  const actions_bid = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
    liquidityPool: string,
    tokenAddress: string,
    currentPrice: BigNumberish,
  ) => {
    const sell_price = sellPrice
    const amount_to_stake = amountToStake

    const approvals =
      tokenAddress == tokenForSale
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
              tokenAddress: tokenAddress,
              amount: BigInt(currentPrice),
            },
          ];

    const calls = await getApprove(provider, approvals, {
      contractName: 'actions',
      entrypoint: 'bid',
      calldata: CallData.compile([
        landLocation,
        tokenForSale,
        sell_price,
        amount_to_stake,
        liquidityPool,
      ]),
    });

    return await provider.execute(snAccount, calls, 'ponzi_land');
  };

  const actions_buy = async (
    snAccount: Account | AccountInterface,
    landLocation: BigNumberish,
    tokenForSale: string,
    sellPrice: BigNumberish,
    amountToStake: BigNumberish,
    liquidityPool: string,
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
      const calls = await getApprove(provider, approvals, {
        contractName: 'actions',
        entrypoint: 'buy',
        calldata: CallData.compile({
          landLocation,
          tokenForSale,
          sellPrice: sellPrice,
          amountToStake: amountToStake,
          liquidityPool,
        }),
      });

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
        {
          contractName: 'actions',
          entrypoint: 'increase_stake',
          calldata: CallData.compile({
            landLocation,
            amountToStake: cairo.uint256(BigInt(amountToStake)),
          }),
        },
      );

      return await provider.execute(snAccount, calls, 'ponzi_land');
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
