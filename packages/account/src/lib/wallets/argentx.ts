import type { StoredSession } from '../context/account.svelte.js';
import { accountConfig } from '../consts.js';
import {
	buildSessionAccount,
	bytesToHexString,
	createSession,
	createSessionRequest,
	type CreateSessionParams,
	type SessionKey
} from '@argent/x-sessions';
import { WALLET_API } from '@starknet-io/types-js';
import { Account, constants, ec, RpcProvider, WalletAccount } from 'starknet';
import { CommonStarknetWallet } from './getStarknet.js';

const FUSE_DISABLE_ARGENT = true;

const STRKFees = [
	{
		tokenAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
		maxAmount: '10000000000000000'
	},
	{
		tokenAddress: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
		maxAmount: '200000000000000000000'
	}
];

async function setupSession(
	wallet: WalletAccount,
	walletObject: WALLET_API.StarknetWindowObject,
	policies?: any
): Promise<[Account, StoredSession]> {
	const privateKey = ec.starkCurve.utils.randomPrivateKey();
	const chainId =
		accountConfig.chainId == 'mainnet'
			? constants.StarknetChainId.SN_MAIN
			: constants.StarknetChainId.SN_SEPOLIA;

	const address = wallet.address;

	const sessionKey: SessionKey = {
		privateKey: bytesToHexString(privateKey),
		publicKey: ec.starkCurve.getStarkKey(privateKey)
	};

	const expiry = Math.floor((Date.now() + 1000 * 60 * 60 * 24) / 1000) as any; // ie: 1 day

	const sessionParams: CreateSessionParams = {
		sessionKey,
		allowedMethods: policies?.contracts
			? Object.entries(policies.contracts).flatMap(([contractAddress, policy]: any[]) =>
					policy.methods.map((method: any) => ({
						selector: method.entrypoint,
						'Contract Address': contractAddress
					}))
				)
			: [],
		expiry,
		metaData: {
			projectID: 'ponzi-land',
			txFees: STRKFees
		}
	};

	// create the session request to get the typed data to be signed
	const sessionRequest = createSessionRequest({
		sessionParams,
		chainId
	});

	// wallet is a StarknetWindowObject
	const authorisationSignature = await walletObject.request({
		type: 'wallet_signTypedData',
		params: sessionRequest.sessionTypedData
	});

	// open session and sign message
	const session = await createSession({
		sessionRequest, // SessionRequest
		address, // Account address
		chainId, // StarknetChainId
		authorisationSignature // Signature
	});

	const sessionAccount = await buildSessionAccount({
		useCacheAuthorisation: false, // optional and defaulted to false, will be added in future developments
		session,
		sessionKey,

		provider: new RpcProvider({
			nodeUrl: accountConfig.rpcUrl,
			chainId: chainId
		})
	});

	console.log('Successfully got account!', sessionAccount.address);

	return [
		sessionAccount,
		{
			expiry,
			address,
			privateKey: sessionKey.privateKey
		}
	];
}

export class ArgentXAccount extends CommonStarknetWallet {
	private _policies?: any;

	constructor(walletObject: WALLET_API.StarknetWindowObject, configOrPolicies?: any) {
		super(walletObject);
		// Handle both direct policies or config object with policies
		if (configOrPolicies?.policies !== undefined) {
			this._policies = configOrPolicies.policies;
		} else {
			this._policies = configOrPolicies;
		}
	}

	supportsSession(): boolean {
		return !FUSE_DISABLE_ARGENT;
	}

	getAccount(): Account | undefined {
		if (FUSE_DISABLE_ARGENT) {
			return this._wallet;
		} else {
			return this._session;
		}
	}

	async setupSession() {
		if (FUSE_DISABLE_ARGENT) {
			return;
		}

		const [account, storedSession] = await setupSession(
			this._wallet!,
			this._walletObject,
			this._policies
		);

		this._session = account;

		return storedSession;
	}
}
