import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { challengeService } from '$lib/midgard/services';

// GET /api/challenges - List challenges (with filters)
export const GET: RequestHandler = async ({ url }) => {
  try {
    const factoryId = url.searchParams.get('factoryId');
    const challengerAddress = url.searchParams.get('challenger');
    const status = url.searchParams.get('status') as
      | 'pending'
      | 'completed'
      | 'expired'
      | 'cancelled'
      | null;
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const challenges = await challengeService.getChallenges({
      factoryId: factoryId || undefined,
      challengerAddress: challengerAddress || undefined,
      status: status || undefined,
      limit,
    });

    return json(challenges);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return json({ error: 'Failed to fetch challenges' }, { status: 500 });
  }
};

// POST /api/challenges - Create new challenge (Phase 1: pending)
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { factoryId, challengerAddress, createdAtBlock } = body;

    // Validate required fields
    if (!factoryId || typeof factoryId !== 'string') {
      return json({ error: 'factoryId is required' }, { status: 400 });
    }
    if (!challengerAddress || typeof challengerAddress !== 'string') {
      return json({ error: 'challengerAddress is required' }, { status: 400 });
    }

    const challenge = await challengeService.createChallenge({
      factoryId,
      challengerAddress,
      createdAtBlock,
    });

    return json(challenge, { status: 201 });
  } catch (error) {
    console.error('Error creating challenge:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create challenge';
    return json({ error: message }, { status: 500 });
  }
};
