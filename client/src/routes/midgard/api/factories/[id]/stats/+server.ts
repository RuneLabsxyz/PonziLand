import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { factoryService } from '$lib/midgard/services';

// GET /api/factories/:id/stats - Get real-time computed stats
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const factory = await factoryService.getFactory(id);

    if (!factory) {
      return json({ error: 'Factory not found' }, { status: 404 });
    }

    const stats = factoryService.computeFactoryStats(factory);

    return json(stats);
  } catch (error) {
    console.error('Error fetching factory stats:', error);
    return json({ error: 'Failed to fetch factory stats' }, { status: 500 });
  }
};
