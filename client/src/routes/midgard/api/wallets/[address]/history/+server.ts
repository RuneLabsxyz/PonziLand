import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { walletService } from '$lib/midgard/services';

// GET /api/wallets/:address/history - Get token events for wallet
export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const { address } = params;
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const history = await walletService.getWalletHistory(address, limit);

    return json(history);
  } catch (error) {
    console.error('Error fetching wallet history:', error);
    return json({ error: 'Failed to fetch wallet history' }, { status: 500 });
  }
};
