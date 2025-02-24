import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSwapInfo } from '$lib/server/layerswap';

export const GET: RequestHandler = async ({ request, params }) => {
  const swapInfo = await getSwapInfo(params.swapId);

  return json({ status: swapInfo.data?.swap?.status || 'unknown' });
};
