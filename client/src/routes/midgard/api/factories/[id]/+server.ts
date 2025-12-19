import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { factoryService } from '$lib/midgard/services';

// GET /api/factories/:id - Get factory by ID (includes computed stats)
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const factory = await factoryService.getFactory(id);

    if (!factory) {
      return json({ error: 'Factory not found' }, { status: 404 });
    }

    // Include computed stats
    const stats = factoryService.computeFactoryStats(factory);

    return json({
      ...factory,
      stats,
    });
  } catch (error) {
    console.error('Error fetching factory:', error);
    return json({ error: 'Failed to fetch factory' }, { status: 500 });
  }
};
