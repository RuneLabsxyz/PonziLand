import { getContext, onMount, setContext } from 'svelte';
import Controller, { type ControllerOptions } from '@cartridge/controller';
import { type AccountConfig } from '../consts.js';
import type { AccountInterface, WalletAccount } from 'starknet';
import type { AccountProvider, StoredSession } from '../context/account.svelte.js';

export class SvelteController extends Controller implements AccountProvider {
	_account?: WalletAccount;
	_username?: string;

	async connect(): Promise<WalletAccount | undefined> {
		// If the user is already logged in, return the existing account
		if (this._account) {
			return this._account;
		}

		try {
			// This is a temporary fix for the type mismatch due to different versions of starknet.js
			const res: WalletAccount | undefined = (await super.connect()) as any;
			if (res) {
				this._account = res;
				this._username = await super.username();

				console.info(
					`User ${this.getUsername()} has logged in successfully!\nAddress; ${
						this._account?.address
					}`
				);

				return res;
			} else {
				throw 'Empty response!';
			}
		} catch (e) {
			console.error(e);
		}
	}

	async setupSession(): Promise<any> {
		// no-op
	}

	async loadSession(storage: StoredSession): Promise<any> {
		// no-op
	}

	getWalletAccount(): AccountInterface | undefined {
		return this.getAccount();
	}

	supportsSession(): boolean {
		return true;
	}

	async disconnect(): Promise<void> {
		this._account = undefined;
		this._username = undefined;
		await super.disconnect();
	}

	getAccount(): AccountInterface | undefined {
		return this._account;
	}

	getUsername(): string | undefined {
		return this._username;
	}
}

const accountKey = Symbol('controller');

export async function connect(controller: SvelteController) {}

function a2hex(str: string): string {
	var arr = [];
	for (var i = 0, l = str.length; i < l; i++) {
		var hex = Number(str.charCodeAt(i)).toString(16);
		arr.push(hex);
	}
	return '0x' + arr.join('');
}

export async function setupController(
	config: AccountConfig & { policies?: any }
): Promise<SvelteController | undefined> {
	if (typeof window === 'undefined') {
		// We are on the server. Return nothing.
		return undefined;
	}

	const controllerOptions: ControllerOptions = {
		defaultChainId: config.chainId === 'mainnet' ? a2hex('SN_MAIN') : a2hex('SN_SEPOLIA'),
		chains: [{ rpcUrl: config.rpcUrl }]
	};

	// Only add policies if provided
	if (config.policies) {
		controllerOptions.policies = config.policies;
	} else {
		controllerOptions.policies = {};
	}
	const controller = new SvelteController(controllerOptions);

	console.info('Starting controller!');

	// Check if the controller is already connected
	if (await controller.probe()) {
		await controller.connect();
	}

	return controller;
}
