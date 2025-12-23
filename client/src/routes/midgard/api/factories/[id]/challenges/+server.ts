import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { factoryService } from '$lib/midgard/services';

// GET /api/factories/:id/challenges - Get challenges for factory
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    // Check if factory exists
    const factory = await factoryService.getFactory(id);
    if (!factory) {
      return json({ error: 'Factory not found' }, { status: 404 });
    }

    const challenges = await factoryService.getFactoryChallenges(id);

    return json(challenges);
  } catch (error) {
    console.error('Error fetching factory challenges:', error);
    return json(
      { error: 'Failed to fetch factory challenges' },
      { status: 500 },
    );
  }
};
