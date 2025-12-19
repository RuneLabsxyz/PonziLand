import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { walletService } from '$lib/midgard/services';

// GET /api/stats/supply - Get current token supply stats
export const GET: RequestHandler = async () => {
  try {
    const stats = await walletService.getSupplyStats();

    return json(stats);
  } catch (error) {
    console.error('Error fetching supply stats:', error);
    return json({ error: 'Failed to fetch supply stats' }, { status: 500 });
  }
};
