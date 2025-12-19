import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { factoryService } from '$lib/midgard/services';

// GET /api/factories - List all factories (with filters)
export const GET: RequestHandler = async ({ url }) => {
  try {
    const status = url.searchParams.get('status') as
      | 'pending'
      | 'active'
      | 'closed'
      | null;
    const ownerAddress = url.searchParams.get('owner');

    const factories = await factoryService.getFactories({
      status: status || undefined,
      ownerAddress: ownerAddress || undefined,
    });

    return json(factories);
  } catch (error) {
    console.error('Error fetching factories:', error);
    return json({ error: 'Failed to fetch factories' }, { status: 500 });
  }
};

// POST /api/factories - Create factory on land (creates in pending status)
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { landId, ownerAddress, stakedGard, createdAtBlock } = body;

    // Validate required fields
    if (!landId || typeof landId !== 'string') {
      return json({ error: 'landId is required' }, { status: 400 });
    }
    if (!ownerAddress || typeof ownerAddress !== 'string') {
      return json({ error: 'ownerAddress is required' }, { status: 400 });
    }
    if (typeof stakedGard !== 'number' || stakedGard <= 0) {
      return json(
        { error: 'stakedGard must be a positive number' },
        { status: 400 },
      );
    }

    // Check if land already has an active or pending factory
    const existingFactory = await factoryService.getFactoryByLand(landId);
    if (existingFactory) {
      return json(
        { error: 'Land already has an active or pending factory' },
        { status: 409 },
      );
    }

    const factory = await factoryService.createFactory({
      landId,
      ownerAddress,
      stakedGard,
      createdAtBlock,
    });

    return json(factory, { status: 201 });
  } catch (error) {
    console.error('Error creating factory:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create factory';
    return json({ error: message }, { status: 500 });
  }
};
