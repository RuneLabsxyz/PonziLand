import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { walletService } from '$lib/midgard/services';

// POST /api/wallets - Create or get wallet (upsert on connect)
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string') {
      return json({ error: 'address is required' }, { status: 400 });
    }

    const wallet = await walletService.getOrCreateWallet(address);
    return json(wallet);
  } catch (error) {
    console.error('Error creating wallet:', error);
    return json({ error: 'Failed to create wallet' }, { status: 500 });
  }
};
