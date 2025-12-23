import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { walletService } from '$lib/midgard/services';

// GET /api/stats/token-events - Get recent token events
export const GET: RequestHandler = async ({ url }) => {
  try {
    const limitParam = url.searchParams.get('limit');
    const typeParam = url.searchParams.get('type') as
      | 'LOCK'
      | 'UNLOCK'
      | 'MINT'
      | 'BURN'
      | 'TRANSFER'
      | null;

    const limit = limitParam ? parseInt(limitParam) : 100;

    const events = await walletService.getTokenEvents(
      typeParam || undefined,
      limit,
    );

    return json(events);
  } catch (error) {
    console.error('Error fetching token events:', error);
    return json({ error: 'Failed to fetch token events' }, { status: 500 });
  }
};
