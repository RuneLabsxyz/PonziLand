import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletStore } from './wallet.store.svelte.js';
import type { TokenPriceConverter } from './tokenPriceConverter.js';
import type { BalanceProvider } from './balance-providers/balanceProvider.js';
import type { Token } from '$lib/types.js';
import { CurrencyAmount } from '$lib/currency/currencyAmount.js';

describe('Test reactivity of wallet store', () => {
	const testTokenETH = {
		name: 'Ethereum',
		symbol: 'ETH',
		decimals: 18,
		address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
		icon: 'https://example.com/eth-logo.png',
		liquidityPoolType: 'n/a'
	} satisfies Token;

	const testTokenUSDC = {
		name: 'USD Coin',
		symbol: 'USDC',
		decimals: 6,
		address: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
		icon: 'https://example.com/usdc-logo.png',
		liquidityPoolType: 'n/a'
	} satisfies Token;

	const testTokenSTRK = {
		name: 'Starknet Token',
		symbol: 'STRK',
		decimals: 18,
		address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
		icon: 'https://example.com/strk-logo.png',
		liquidityPoolType: 'n/a'
	} satisfies Token;

	let mockTokenPriceConverter: TokenPriceConverter;
	let mockBalanceProvider: BalanceProvider;

	beforeEach(() => {
		// Mock TokenPriceConverter
		mockTokenPriceConverter = {
			update: vi.fn().mockResolvedValue(undefined),
			getRatio: vi.fn().mockImplementation((address: string) => {
				const ratios = {
					[testTokenETH.address]: CurrencyAmount.fromScaled(1, testTokenETH),
					[testTokenUSDC.address]: CurrencyAmount.fromScaled(0.0003, testTokenUSDC),
					[testTokenSTRK.address]: CurrencyAmount.fromScaled(0.5, testTokenSTRK)
				};
				return ratios[address];
			}),
			convertTokenAmount: vi
				.fn()
				.mockImplementation((fromAmount: CurrencyAmount, fromToken: Token, toToken: Token) => {
					if (fromToken.address === toToken.address) {
						return fromAmount;
					}
					// Simple mock conversion - just return equivalent amount in target token
					return CurrencyAmount.fromRaw(fromAmount.rawValue(), toToken);
				})
		};

		// Mock BalanceProvider
		mockBalanceProvider = {
			registerTokens: vi.fn(),
			forceUpdate: vi.fn().mockResolvedValue(undefined),
			getBalance: vi.fn().mockImplementation((token: Token) => {
				const balances = {
					[testTokenETH.address]: CurrencyAmount.fromScaled(10, testTokenETH),
					[testTokenUSDC.address]: CurrencyAmount.fromScaled(5000, testTokenUSDC),
					[testTokenSTRK.address]: CurrencyAmount.fromScaled(1000, testTokenSTRK)
				};
				return Promise.resolve(balances[token.address] || CurrencyAmount.fromScaled(0, token));
			})
		};
	});

	const createTestStore = (options?: {
		tokens?: Token[];
		baseToken?: Token;
		priceConverter?: TokenPriceConverter;
		balanceProvider?: BalanceProvider;
	}) => {
		const tokens = options?.tokens || [testTokenETH, testTokenUSDC, testTokenSTRK];
		const baseToken = options?.baseToken || testTokenETH;
		const tokenPrice = options?.priceConverter || mockTokenPriceConverter;
		const provider = options?.balanceProvider || mockBalanceProvider;

		return new WalletStore({
			provider,
			tokenPrice,
			tokens,
			baseToken
		});
	};

	it('should create wallet store with mocked providers', () => {
		const store = createTestStore();
		expect(store).toBeDefined();
		expect(store.getTotalBalance()?.rawValue().toNumber()).toBe(0);
	});

	it('should update balances and call provider methods', async () => {
		const store = createTestStore();
		await store.update();

		// Verify that the mock methods were called
		expect(mockTokenPriceConverter.update).toHaveBeenCalledTimes(1);
		expect(mockBalanceProvider.getBalance).toHaveBeenCalledTimes(3); // Once for each token

		// Check that balances are available
		const ethBalance = store.getBalance(testTokenETH.address);
		expect(ethBalance).toBeDefined();
		expect(ethBalance?.rawValue().toNumber()).toBeGreaterThan(0);

		const totalBalance = store.getTotalBalance();
		expect(totalBalance).toBeDefined();
	});

	it('should handle optimistic balance updates', () => {
		const store = createTestStore();
		const newBalance = CurrencyAmount.fromScaled(25, testTokenETH);

		store.optimisticallySetBalance(testTokenETH.address, newBalance);

		const retrievedBalance = store.getBalance(testTokenETH.address);
		expect(retrievedBalance?.rawValue().toString()).toBe(newBalance.rawValue().toString());
	});

	it('should retrieve token information correctly', () => {
		const store = createTestStore();

		const ethToken = store.getToken(testTokenETH.address);
		expect(ethToken).toEqual(testTokenETH);

		const nonExistentToken = store.getToken('0xinvalidaddress');
		expect(nonExistentToken).toBeNull();
	});

	it('should handle base token changes', async () => {
		const store = createTestStore({ baseToken: testTokenETH });

		await store.update();

		await store.setBaseToken(testTokenUSDC);
		const newTotalBalance = store.getTotalBalance();

		expect(newTotalBalance?.getToken()?.symbol).toBe('USDC');
		expect(mockTokenPriceConverter.update).toHaveBeenCalledTimes(2); // Once for each update
	});

	it('should handle balance provider errors gracefully', async () => {
		const errorBalanceProvider = {
			...mockBalanceProvider,
			getBalance: vi.fn().mockRejectedValue(new Error('Token not found'))
		};

		const store = createTestStore({ balanceProvider: errorBalanceProvider });

		// Should not throw, but should handle the error internally
		await expect(store.update()).resolves.not.toThrow();
	});

	it('should convert token amounts using price converter', async () => {
		const store = createTestStore();

		// Mock a specific conversion
		const mockConversion = vi.mocked(mockTokenPriceConverter.convertTokenAmount);
		mockConversion.mockReturnValue(CurrencyAmount.fromScaled(2000, testTokenUSDC));

		await store.update();

		// The convertTokenAmount should be called during total balance calculation
		expect(mockConversion).toHaveBeenCalled();
	});

	it('should reset call counts between tests', () => {
		// This test verifies that beforeEach properly resets mocks
		expect(vi.mocked(mockTokenPriceConverter.update)).toHaveBeenCalledTimes(0);
		expect(vi.mocked(mockBalanceProvider.getBalance)).toHaveBeenCalledTimes(0);
	});
});
