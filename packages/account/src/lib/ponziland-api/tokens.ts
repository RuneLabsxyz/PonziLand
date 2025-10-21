import type { Token } from '$lib/types.js';
import data from '../variables/mainnet.json' with { type: 'json' };

export type ApiToken = {
	symbol: string;
	address: string;
};

/**
 * Fetches available tokens from the PonziLand API
 */
export async function getTokens(apiUrl: string): Promise<Token[]> {
	const endpoint = `${apiUrl}/tokens`;

	try {
		const response = await fetch(endpoint);

		// Check if the response is ok
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const apiTokens: ApiToken[] = await response.json();

		// Validate the response is an array
		if (!Array.isArray(apiTokens)) {
			throw new Error('Invalid response format from token endpoint');
		}

		// Create Token objects from API response
		const tokens = apiTokens.map((apiToken) => {
			// Check if this token exists in the data file to get full details
			const existingToken = data.availableTokens.find(
				(t) => t.address.toLowerCase() === apiToken.address.toLowerCase()
			);

			if (existingToken) {
				// Use existing token data if available
				return {
					...existingToken,
					icon: `/tokens/${apiToken.symbol.toLowerCase()}/icon.svg`
				} satisfies Token;
			}

			// Create minimal token object for tokens not in data file
			return {
				name: apiToken.symbol,
				symbol: apiToken.symbol,
				address: apiToken.address,
				liquidityPoolType: '1-2', // default
				decimals: 18, // default for most Starknet tokens
				icon: `/tokens/${apiToken.symbol.toLowerCase()}/icon.svg`
			} as Token;
		});

		console.log(`Successfully loaded ${tokens.length} tokens from API`);
		return tokens;
	} catch (err) {
		console.error('Error fetching tokens, reverting to data file:', err);
		// Fallback to tokens from data file
		console.log(`Using ${data.availableTokens.length} tokens from data file`);
		return data.availableTokens.map((token) => ({
			...token,
			icon: `/tokens/${token.symbol.toLowerCase()}/icon.svg`
		})) as Token[];
	}
}
