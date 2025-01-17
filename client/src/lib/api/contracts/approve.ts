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
  data: ApprovalData[],
  spendingCall: DojoCall | Call,
  namespace: string = 'ponzi_land',
): Promise<[Call[], DojoCall | Call]> {
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

  return [approvals, spendingCall];
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
    const sell_price = cairo.uint256(sellPrice);
    const amount_to_stake = cairo.uint256(amountToStake);

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

    return await provider.execute(
      snAccount,
      [...calls[0], calls[1]],
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
      const calls = await getApprove(
        provider,
        [
          {
            tokenAddress: tokenForSale,
            amount: amountToStake,
          },
        ],
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
      );

      return await provider.execute(
        snAccount,
        [...calls[0], calls[1]],
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
      const calls = await getApprove(
        provider,
        [
          {
            tokenAddress: stakingToken,
            amount: amountToStake,
          },
        ],
        {
          contractName: 'actions',
          entrypoint: 'increase_stake',
          calldata: [landLocation, amountToStake],
        },
      );

      return await provider.execute(
        snAccount,
        [...calls[0], calls[1]],
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
