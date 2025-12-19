import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { challengeService } from '$lib/midgard/services';

// POST /api/challenges/:id/cancel - Cancel pending challenge (refund ticket)
export const POST: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    const challenge = await challengeService.cancelChallenge(id);

    return json(challenge);
  } catch (error) {
    console.error('Error cancelling challenge:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to cancel challenge';
    return json({ error: message }, { status: 500 });
  }
};
