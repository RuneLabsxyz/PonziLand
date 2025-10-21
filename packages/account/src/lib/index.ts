// Core wallet functionality
export { WalletStore } from './stores/wallet.store.svelte.js';

// Account state
export { default as accountState } from './account.svelte.js';

// Types and interfaces
export type { Token } from '$lib/types.js';

// PonziLand API
export { getTokenPrices as getPonziLandApiTokenPrices, getTokens } from './ponziland-api/index.js';

// Utilities
export { padAddress } from './utils/address.js';
export {
	fetchTokenBalance
	// fetchTokenBalanceViaContract,
	// fetchBalanceSimple
} from './utils/balances.js';
export { CurrencyAmount } from './currency/currencyAmount.js';

// ERC20 ABI
export { ERC20_abi } from './utils/erc20Abi.js';

// Re-export existing functionality for backward compatibility
export * from './types.js';
export * from './consts.js';
export * from './currency/index.js';

// Account context
export {
	useAccount,
	setupAccount,
	type AccountProvider,
	type Event,
	type StoredSession
} from './context/account.svelte.js';

// Types for external consumers
export type { ProviderInterface } from 'starknet';
