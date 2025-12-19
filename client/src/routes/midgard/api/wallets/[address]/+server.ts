import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { walletService } from '$lib/midgard/services';

// GET /api/wallets/:address - Get wallet by address
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { address } = params;

    const wallet = await walletService.getWallet(address);

    if (!wallet) {
      return json({ error: 'Wallet not found' }, { status: 404 });
    }

    return json(wallet);
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
};
