import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { closeService } from '$lib/midgard/services';

// POST /api/factories/:id/close - Request factory close (idempotent)
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;

    // Optional: allow specifying close reason
    let reason: 'burn_exceeded' | 'stake_depleted' | 'manual' = 'manual';
    try {
      const body = await request.json();
      if (
        body.reason &&
        ['burn_exceeded', 'stake_depleted', 'manual'].includes(body.reason)
      ) {
        reason = body.reason;
      }
    } catch {
      // No body or invalid JSON, use default reason
    }

    const result = await closeService.closeFactory(id, reason);

    if (result.status === 'not_ready') {
      return json(
        { status: result.status, error: 'Factory is not ready to close' },
        { status: 400 },
      );
    }

    if (result.status === 'already_closed') {
      return json(
        { status: result.status, message: 'Factory is already closed' },
        { status: 200 },
      );
    }

    if (result.status === 'already_processing') {
      return json(
        {
          status: result.status,
          message: 'Factory close is already in progress',
        },
        { status: 202 },
      );
    }

    return json(result);
  } catch (error) {
    console.error('Error closing factory:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to close factory';
    return json({ error: message }, { status: 500 });
  }
};
