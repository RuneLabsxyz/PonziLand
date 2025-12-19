import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { factoryService } from '$lib/midgard/services';

// POST /api/factories/:id/activate - Activate a pending factory with a score
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { score } = body;

    // Validate score
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return json(
        { error: 'score must be a number between 0 and 100' },
        { status: 400 },
      );
    }

    const factory = await factoryService.activateFactory(id, score);

    return json(factory);
  } catch (error) {
    console.error('Error activating factory:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to activate factory';
    return json({ error: message }, { status: 500 });
  }
};
