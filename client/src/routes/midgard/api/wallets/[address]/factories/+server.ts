import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { factoryService } from '$lib/midgard/services';

// GET /api/wallets/:address/factories - Get factories owned by wallet
export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const { address } = params;
    const status = url.searchParams.get('status') as 'active' | 'closed' | null;

    const factories = await factoryService.getFactories({
      ownerAddress: address,
      status: status || undefined,
    });

    return json(factories);
  } catch (error) {
    console.error('Error fetching wallet factories:', error);
    return json({ error: 'Failed to fetch wallet factories' }, { status: 500 });
  }
};
