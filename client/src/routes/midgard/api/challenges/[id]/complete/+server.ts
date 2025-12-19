import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { challengeService } from '$lib/midgard/services';

// POST /api/challenges/:id/complete - Complete challenge with scores (Phase 2)
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;

    let playerScore: number | undefined;
    try {
      const body = await request.json();
      if (typeof body.playerScore === 'number') {
        playerScore = body.playerScore;
      }
    } catch {
      // No body or invalid JSON
    }

    let result;
    if (playerScore !== undefined) {
      // Complete with provided score
      result = await challengeService.completeChallenge(id, playerScore);
    } else {
      // Complete by playing the game (random score)
      result = await challengeService.completeChallengeWithGame(id);
    }

    return json(result);
  } catch (error) {
    console.error('Error completing challenge:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to complete challenge';
    return json({ error: message }, { status: 500 });
  }
};
