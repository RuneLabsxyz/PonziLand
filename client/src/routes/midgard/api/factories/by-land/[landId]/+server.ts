import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { factoryService } from '$lib/midgard/services';

// GET /api/factories/by-land/:landId - Get active factory on specific land
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { landId } = params;

    const factory = await factoryService.getFactoryByLand(landId);

    if (!factory) {
      return json({ error: 'No active factory on this land' }, { status: 404 });
    }

    // Include computed stats
    const stats = factoryService.computeFactoryStats(factory);

    return json({
      ...factory,
      stats,
    });
  } catch (error) {
    console.error('Error fetching factory by land:', error);
    return json({ error: 'Failed to fetch factory' }, { status: 500 });
  }
};
