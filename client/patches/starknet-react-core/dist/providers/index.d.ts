import { Chain } from '@starknet-react/chains';
import * as starknet from 'starknet';
import { ProviderInterface, RpcProviderOptions, RpcProvider } from 'starknet';

type ChainProviderFactory<T extends ProviderInterface = ProviderInterface> = (chain: Chain) => T | null;

/** Arguments for `jsonRpcProvider`. */
type JsonRpcProviderArgs = {
    rpc: (chain: Chain) => RpcProviderOptions | null;
};
/** Configure the JSON-RPC provider using the provided function. */
declare function jsonRpcProvider({ rpc, }: JsonRpcProviderArgs): ChainProviderFactory<RpcProvider>;

/** Configure the provider to use the public RPC endpoint. */
declare function publicProvider(): ChainProviderFactory<starknet.Provider>;

/** Arguments for `alchemyProvider`. */
type AlchemyProviderArgs = {
    /** Alchemy API key. */
    apiKey: string;
};
/** Configure the Alchemy provider using the provided API key. */
declare function alchemyProvider({ apiKey }: AlchemyProviderArgs): ChainProviderFactory<starknet.Provider>;

/** Arguments for `blastProvider`. */
type BlastProviderArgs = {
    /** Blast API key. */
    apiKey: string;
};
/** Configure the Blast provider using the provided API key. */
declare function blastProvider({ apiKey }: BlastProviderArgs): ChainProviderFactory<starknet.Provider>;

/** Configure the Cartridge provider. */
declare function cartridgeProvider(): ChainProviderFactory<starknet.Provider>;

/** Arguments for `infuraProvider`. */
type InfuraProviderArgs = {
    /** Infura API key. */
    apiKey: string;
};
/** Configure the Infura provider using the provided API key. */
declare function infuraProvider({ apiKey }: InfuraProviderArgs): ChainProviderFactory<starknet.Provider>;

/** Arguments for `lavaProvider`. */
type LavaProviderArgs = {
    /** Lava API key. */
    apiKey: string;
};
/** Configure the Lava provider using the provided API key. */
declare function lavaProvider({ apiKey }: LavaProviderArgs): ChainProviderFactory<starknet.Provider>;

/** Arguments for `reddioProvider`. */
type ReddioProviderArgs = {
    /** Reddio API key. */
    apiKey: string;
};
/** Configure the Reddio provider using the provided API key. */
declare function reddioProvider({ apiKey }: ReddioProviderArgs): ChainProviderFactory<starknet.Provider>;

/** Arguments for `slotProvider`. */
type SlotProviderArgs = {
    /** The name of your slot instance. */
    projectId: string;
};
/** Configure the Slot provider using the provided Project ID. */
declare function slotProvider({ projectId }: SlotProviderArgs): ChainProviderFactory<starknet.Provider>;

export { type AlchemyProviderArgs, type BlastProviderArgs, type ChainProviderFactory, type InfuraProviderArgs, type JsonRpcProviderArgs, type LavaProviderArgs, type ReddioProviderArgs, type SlotProviderArgs, alchemyProvider, blastProvider, cartridgeProvider, infuraProvider, jsonRpcProvider, lavaProvider, publicProvider, reddioProvider, slotProvider };
