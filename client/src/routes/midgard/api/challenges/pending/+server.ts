import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { challengeService } from '$lib/midgard/services';

// GET /api/challenges/pending - Get all pending challenges
export const GET: RequestHandler = async ({ url }) => {
  try {
    const factoryId = url.searchParams.get('factoryId');

    let challenges;
    if (factoryId) {
      challenges =
        await challengeService.getPendingChallengesForFactory(factoryId);
    } else {
      challenges = await challengeService.getPendingChallenges();
    }

    return json(challenges);
  } catch (error) {
    console.error('Error fetching pending challenges:', error);
    return json(
      { error: 'Failed to fetch pending challenges' },
      { status: 500 },
    );
  }
};
