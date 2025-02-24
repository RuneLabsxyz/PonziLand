import { getNetworks } from '$lib/server/layerswap';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
  const networks = await getNetworks();

  if (networks.error) {
    throw new Error('Networks not found');
  }

  return { networks: networks.data };
};
