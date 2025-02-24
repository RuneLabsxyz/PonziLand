import { getDepositActions, getSwapInfo } from '$lib/server/layerswap';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const swapId = params.swapId;

  const deposits = await getDepositActions(swapId);

  const swap = await getSwapInfo(swapId);

  return {
    deposits: deposits?.data,

    swap: {
      id: swapId,
      amount: swap.data?.swap?.requested_amount || 0,
      sourceSymbol: swap.data?.swap?.source_token?.symbol || 'unknown',
      status: swap.data?.swap?.status || 'unknown',
      txExplorerTemplate:
        swap.data?.swap?.source_network?.transaction_explorer_template,
      failReason: swap.data?.swap?.fail_reason,
      transactions: swap.data?.swap?.transactions || [],
      averageCompletionTime: swap.data?.quote?.avg_completion_time || 0,
    },
  };
};
