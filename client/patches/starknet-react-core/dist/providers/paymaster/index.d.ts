import { PaymasterRpc, RpcProviderOptions } from 'starknet';
import { Chain } from '@starknet-react/chains';

type ChainPaymasterFactory<T extends PaymasterRpc = PaymasterRpc> = (chain: Chain) => T | null;

/** Arguments for `avnuPaymasterProvider`. */
type AvnuPaymasterProviderArgs = {
    /** Avnu API key. */
    apiKey?: string;
};
/** Configure the Avnu paymaster provider using the provided API key. */
declare function avnuPaymasterProvider({ apiKey, }: AvnuPaymasterProviderArgs): ChainPaymasterFactory<PaymasterRpc>;

/** Arguments for `jsonRpcProvider`. */
type PaymasterRpcProviderArgs = {
    rpc: (chain: Chain) => RpcProviderOptions | null;
};
/** Configure the JSON-RPC provider using the provided function. */
declare function paymasterRpcProvider({ rpc, }: PaymasterRpcProviderArgs): ChainPaymasterFactory<PaymasterRpc>;

export { type AvnuPaymasterProviderArgs, type ChainPaymasterFactory, type PaymasterRpcProviderArgs, avnuPaymasterProvider, paymasterRpcProvider };
