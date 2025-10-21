const DEFAULT_RPC_URL = 'https://api.cartridge.gg/x/starknet/mainnet';
const DEFAULT_CHAIN_ID = 'mainnet';

export type ChainId = 'mainnet' | 'sepolia';

export type AccountConfig = {
	rpcUrl: string;
	chainId: ChainId;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	policies?: any;
};

const _accountConfig: AccountConfig = {
	rpcUrl: DEFAULT_RPC_URL,
	chainId: DEFAULT_CHAIN_ID as ChainId
};

export const accountConfig: AccountConfig = new Proxy(_accountConfig, {
	get(target, prop) {
		return target[prop as keyof AccountConfig];
	},
	set() {
		throw new Error('Use configureAccount() to update configuration');
	}
});

export function configureAccount(config: Partial<AccountConfig>): void {
	if (config.rpcUrl !== undefined) {
		_accountConfig.rpcUrl = config.rpcUrl;
	}
	if (config.chainId !== undefined) {
		if (config.chainId !== 'mainnet' && config.chainId !== 'sepolia') {
			throw new Error('chainId must be either "mainnet" or "sepolia"');
		}
		_accountConfig.chainId = config.chainId;
	}
	if (config.policies !== undefined) {
		_accountConfig.policies = config.policies;
	}
}

export function getAccountConfig(): AccountConfig {
	return { ..._accountConfig };
}
