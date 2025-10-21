import { ProviderInterface, Contract } from 'starknet';
import { ERC20_abi } from './erc20Abi.js';

export const fetchTokenBalance = async (
	tokenAddress: string,
	accountAddress: string,
	provider: ProviderInterface
): Promise<bigint | null> => {
	try {
		// Create ERC20 contract instance
		const contract = new Contract({
			abi: ERC20_abi,
			address: tokenAddress,
			providerOrAccount: provider
		});

		// Call balanceOf with the account address
		const result = await contract.call('balanceOf', [accountAddress]);

		console.log(result);

		return result as bigint;
	} catch (error) {
		console.error(`Error fetching balance for token ${tokenAddress}:`, error);
		return BigInt(0);
	}
};
