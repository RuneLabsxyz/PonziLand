import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const RPC_URLS: Record<string, string> = {
  solanamainnet: 'https://api.mainnet-beta.solana.com',
  // Add more chains as needed
};

export const POST: RequestHandler = async ({ params, request }) => {
  const { chain } = params;
  const rpcUrl = RPC_URLS[chain];

  if (!rpcUrl) {
    throw error(404, `RPC not found for chain: ${chain}`);
  }

  try {
    const body = await request.json();

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return json(data);
  } catch (err) {
    console.error(`RPC proxy error for ${chain}:`, err);
    throw error(500, 'RPC request failed');
  }
};
