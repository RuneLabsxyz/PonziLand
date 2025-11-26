import type { RequestHandler } from './$types';

const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		const response = await fetch(SOLANA_RPC_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		const data = await response.json();

		return new Response(JSON.stringify(data), {
			status: response.status,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('Solana RPC proxy error:', error);
		return new Response(
			JSON.stringify({
				error: 'RPC proxy error',
				message: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
};

export const GET: RequestHandler = async () => {
	return new Response(JSON.stringify({ status: 'Solana RPC proxy is running' }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
