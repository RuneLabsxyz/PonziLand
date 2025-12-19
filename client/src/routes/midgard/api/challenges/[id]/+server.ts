import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { challengeService } from '$lib/midgard/services';

// GET /api/challenges/:id - Get challenge by ID
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const challenge = await challengeService.getChallenge(id);

    if (!challenge) {
      return json({ error: 'Challenge not found' }, { status: 404 });
    }

    return json(challenge);
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return json({ error: 'Failed to fetch challenge' }, { status: 500 });
  }
};
