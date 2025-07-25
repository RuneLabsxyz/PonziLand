import { C as ConnectorIcons, a as Connector, b as ConnectArgs, c as ConnectorData, E as Explorer, d as ExplorerFactory } from './index-BZmGM8SW.js';
export { A as AccountStatus, B as Balance, r as CallQueryKey, w as ConnectVariables, O as DeployAccountVariables, X as EstimateFeesArgs, aq as GetStarkprofileResponse, aQ as PaymasterEstimateFeesArgs, aC as RequestArgs, aA as RequestMessageTypes, aB as RequestResult, am as StarkNameArgs, an as StarkNameResult, ap as StarkProfileArgs, S as StarknetTypedContract, U as UseAccountResult, e as UseAddChainArgs, f as UseAddChainProps, g as UseAddChainResult, i as UseBalanceProps, j as UseBalanceResult, o as UseBlockNumberProps, p as UseBlockNumberResult, l as UseBlockProps, m as UseBlockResult, s as UseCallProps, t as UseCallResult, x as UseConnectProps, y as UseConnectResult, D as UseContractArgs, H as UseContractFactoryProps, I as UseContractFactoryResult, F as UseContractResult, K as UseDeclareContractArgs, L as UseDeclareContractProps, M as UseDeclareContractResult, P as UseDeployAccountProps, Q as UseDeployAccountResult, T as UseDisconnectProps, V as UseDisconnectResult, Y as UseEstimateFeesProps, Z as UseEstimateFeesResult, aN as UseEventsProps, aO as UseEventsResult, a1 as UseNetworkResult, a3 as UseNonceForAddressProps, a4 as UseNonceForAddressResult, aR as UsePaymasterEstimateFeesProps, aS as UsePaymasterEstimateFeesResult, aU as UsePaymasterGasTokensProps, aV as UsePaymasterGasTokensResult, aX as UsePaymasterSendTransactionArgs, aY as UsePaymasterSendTransactionResult, a6 as UseProviderResult, a8 as UseReadContractProps, a9 as UseReadContractResult, ab as UseSendTransactionArgs, ac as UseSendTransactionProps, ad as UseSendTransactionResult, af as UseSignTypedDataArgs, ag as UseSignTypedDataProps, ah as UseSignTypedDataResult, aj as UseStarkAddressProps, ak as UseStarkAddressResult, ar as UseStarkProfileResult, at as UseSwitchChainArgs, au as UseSwitchChainProps, av as UseSwitchChainResult, ax as UseTransactionReceiptProps, ay as UseTransactionReceiptResult, aK as UseUniversalDeployerContractProps, aL as UseUniversalDeployerContractResult, aD as UseWalletRequestProps, aE as UseWalletRequestResult, aG as UseWatchAssetArgs, aH as UseWatchAssetProps, aI as UseWatchAssetResult, u as useAccount, h as useAddChain, k as useBalance, n as useBlock, q as useBlockNumber, v as useCall, z as useConnect, G as useContract, J as useContractFactory, N as useDeclareContract, R as useDeployAccount, W as useDisconnect, _ as useEstimateFees, aP as useEvents, $ as useExplorer, a0 as useInvalidateOnBlock, a2 as useNetwork, a5 as useNonceForAddress, aT as usePaymasterEstimateFees, aW as usePaymasterGasTokens, aZ as usePaymasterSendTransaction, a7 as useProvider, aa as useReadContract, ae as useSendTransaction, ai as useSignTypedData, al as useStarkAddress, ao as useStarkName, as as useStarkProfile, aw as useSwitchChain, az as useTransactionReceipt, aM as useUniversalDeployerContract, aF as useWalletRequest, aJ as useWatchAsset } from './index-BZmGM8SW.js';
import { RpcMessage, RequestFnCall, RpcTypeToMessageMap } from '@starknet-io/types-js';
import { ProviderInterface, PaymasterInterface, AccountInterface, ProviderOptions, constants } from 'starknet';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { Chain, Address } from '@starknet-react/chains';
export { Address } from '@starknet-react/chains';
import { QueryClient } from '@tanstack/react-query';
import React from 'react';
import { ChainProviderFactory } from './providers/index.js';
export { AlchemyProviderArgs, BlastProviderArgs, InfuraProviderArgs, JsonRpcProviderArgs, LavaProviderArgs, ReddioProviderArgs, SlotProviderArgs, alchemyProvider, blastProvider, cartridgeProvider, infuraProvider, jsonRpcProvider, lavaProvider, publicProvider, reddioProvider, slotProvider } from './providers/index.js';
import { ChainPaymasterFactory } from './providers/paymaster/index.js';
export { AvnuPaymasterProviderArgs, PaymasterRpcProviderArgs, avnuPaymasterProvider, paymasterRpcProvider } from './providers/paymaster/index.js';
export { Abi } from 'abi-wan-kanabi';
import 'eventemitter3';
import 'abi-wan-kanabi/kanabi';

/** Injected connector options. */
interface InjectedConnectorOptions {
    /** The wallet id. */
    id: string;
    /** Wallet human readable name. */
    name?: string;
    /** Wallet icons. */
    icon?: ConnectorIcons;
}
declare class InjectedConnector extends Connector {
    private _wallet?;
    private readonly _options;
    constructor({ options }: {
        options: InjectedConnectorOptions;
    });
    get id(): string;
    get name(): string;
    get icon(): ConnectorIcons;
    available(): boolean;
    chainId(): Promise<bigint>;
    ready(): Promise<boolean>;
    account(provider: ProviderInterface, paymasterProvider?: PaymasterInterface): Promise<AccountInterface>;
    connect(_args?: ConnectArgs): Promise<ConnectorData>;
    disconnect(): Promise<void>;
    request<T extends RpcMessage["type"]>(call: RequestFnCall<T>): Promise<RpcTypeToMessageMap[T]["result"]>;
    private isLocked;
    private requestChainId;
    private ensureWallet;
    protected onAccountsChanged(accounts?: string[]): Promise<void>;
    private onNetworkChanged;
    private switchChain;
}

/** Injected connector options. */
interface LegacyInjectedConnectorOptions {
    /** The wallet id. */
    id: string;
    /** Wallet human readable name. */
    name?: string;
    /** Wallet icons. */
    icon?: ConnectorIcons;
}
declare class LegacyInjectedConnector extends Connector {
    private _wallet?;
    private _options;
    constructor({ options }: {
        options: LegacyInjectedConnectorOptions;
    });
    get id(): string;
    get name(): string;
    get icon(): ConnectorIcons;
    available(): boolean;
    chainId(): Promise<bigint>;
    ready(): Promise<boolean>;
    connect(_args?: ConnectArgs): Promise<ConnectorData>;
    disconnect(): Promise<void>;
    account(): Promise<AccountInterface>;
    request<T extends RpcMessage["type"]>(call: RequestFnCall<T>): Promise<RpcTypeToMessageMap[T]["result"]>;
    private ensureWallet;
    private onAccountsChanged;
    private onNetworkChanged;
}

type UseInjectedConnectorsProps = {
    /** List of recommended connectors to display. */
    recommended?: Connector[];
    /** Whether to include recommended connectors in the list. */
    includeRecommended?: "always" | "onlyIfNoConnectors";
    /** How to order connectors. */
    order?: "random" | "alphabetical";
    /** Shim the following legacy connectors if they are detected. */
    shimLegacyConnectors?: string[];
};
type UseInjectedConnectorsResult = {
    /** Connectors list. */
    connectors: Connector[];
};
declare function useInjectedConnectors({ recommended, includeRecommended, order, shimLegacyConnectors, }: UseInjectedConnectorsProps): UseInjectedConnectorsResult;

type MockConnectorOptions = {
    /** The wallet id. */
    id: string;
    /** Wallet human readable name. */
    name: string;
    /** Wallet icons. */
    icon?: ConnectorIcons;
    /** Whether the connector is available for use. */
    available?: boolean;
    /** Whether the connector should fail to connect. */
    failConnect?: boolean;
    /** Include account when switching chain. */
    unifiedSwitchAccountAndChain?: boolean;
    /** Emit change account event when switching chain. */
    emitChangeAccountOnChainSwitch?: boolean;
    /** Reject request calls */
    rejectRequest?: boolean;
};
type MockConnectorAccounts = {
    sepolia: AccountInterface[];
    mainnet: AccountInterface[];
};
declare class MockConnector extends Connector {
    private _accounts;
    private _accountIndex;
    private _connected;
    private _chainId;
    options: MockConnectorOptions;
    constructor({ accounts, options, }: {
        accounts: MockConnectorAccounts;
        options: MockConnectorOptions;
    });
    switchChain(chainId: bigint): void;
    switchAccount(accountIndex: number): void;
    get id(): string;
    get name(): string;
    get icon(): ConnectorIcons;
    available(): boolean;
    chainId(): Promise<bigint>;
    ready(): Promise<boolean>;
    connect(): Promise<ConnectorData>;
    disconnect(): Promise<void>;
    request<T extends RpcMessage["type"]>(call: RequestFnCall<T>): Promise<RpcTypeToMessageMap[T]["result"]>;
    account(provider: ProviderOptions | ProviderInterface, paymasterProvider?: PaymasterInterface): Promise<AccountInterface>;
    private get _account();
}

declare function ready(): InjectedConnector;
declare const argent: typeof ready;
declare function braavos(): InjectedConnector;
declare function injected({ id }: {
    id: string;
}): InjectedConnector;
declare function legacyInjected({ id, }: {
    id: string;
}): LegacyInjectedConnector;

declare class CartridgeExplorer implements Explorer {
    name: string;
    private link;
    constructor(chain: Chain);
    block(hashOrNumber: {
        hash?: string;
        number?: number;
    }): string;
    transaction(hash: string): string;
    contract(address: string): string;
    class(hash: string): string;
}
declare const cartridge: ExplorerFactory<CartridgeExplorer>;

declare class StarkscanExplorer implements Explorer {
    name: string;
    private link;
    constructor(chain: Chain);
    block(hashOrNumber: {
        hash?: string;
        number?: number;
    }): string;
    transaction(hash: string): string;
    contract(address: string): string;
    class(hash: string): string;
}
declare const starkscan: ExplorerFactory<StarkscanExplorer>;

declare class ViewblockExplorer implements Explorer {
    name: string;
    private link;
    constructor(chain: Chain);
    block(hashOrNumber: {
        hash?: string;
        number?: number;
    }): string;
    transaction(hash: string): string;
    contract(address: string): string;
    class(hash: string): string;
}
declare const viewblock: ExplorerFactory<ViewblockExplorer>;

declare class VoyagerExplorer implements Explorer {
    name: string;
    private link;
    constructor(chain: Chain);
    block(hashOrNumber: {
        hash?: string;
        number?: number;
    }): string;
    transaction(hash: string): string;
    contract(address: string): string;
    class(hash: string): string;
}
declare const voyager: ExplorerFactory<VoyagerExplorer>;

/** Arguments for `StarknetProvider`. */
interface StarknetProviderProps {
    /** Chains supported by the app. */
    chains: Chain[];
    /** Provider to use. */
    provider: ChainProviderFactory;
    /** Paymaster provider to use. */
    paymasterProvider?: ChainPaymasterFactory;
    /** List of connectors to use. */
    connectors?: Connector[];
    /** Explorer to use. */
    explorer?: ExplorerFactory;
    /** Connect the first available connector on page load. */
    autoConnect?: boolean;
    /** React-query client to use. */
    queryClient?: QueryClient;
    /** Application. */
    children?: React.ReactNode;
    /** Default chain to use when wallet is not connected */
    defaultChainId?: bigint;
}
declare function starknetChainId(chainId: bigint): constants.StarknetChainId | undefined;

declare function AccountProvider({ address, account, children, }: {
    address?: Address;
    account?: AccountInterface;
    children: React.ReactNode;
}): react_jsx_runtime.JSX.Element;

type StarknetConfigProps = StarknetProviderProps;
declare function StarknetConfig({ children, ...config }: StarknetConfigProps): react_jsx_runtime.JSX.Element;

declare class ConnectorAlreadyConnectedError extends Error {
    name: string;
    message: string;
}
declare class ConnectorNotConnectedError extends Error {
    name: string;
    message: string;
}
declare class ConnectorNotFoundError extends Error {
    name: string;
    message: string;
}
declare class UserRejectedRequestError extends Error {
    name: string;
    message: string;
}
declare class WalletRequestError extends Error {
    constructor(error?: string | Error | unknown, cause?: Error | unknown);
}
declare class UserNotConnectedError extends Error {
    name: string;
    message: string;
}
declare class UnsupportedAccountInterfaceError extends Error {
    name: string;
    message: string;
}

/**
 * Validate and format the address.
 *
 * @param address - The address string to validate.
 * @returns The validated and formatted address as Address type.
 */
declare function getAddress(address: string): Address;

export { CartridgeExplorer, ChainPaymasterFactory, ChainProviderFactory, ConnectArgs, Connector, ConnectorAlreadyConnectedError, ConnectorNotConnectedError, ConnectorNotFoundError, Explorer, ExplorerFactory, InjectedConnector, type InjectedConnectorOptions, LegacyInjectedConnector, type LegacyInjectedConnectorOptions, MockConnector, type MockConnectorAccounts, type MockConnectorOptions, AccountProvider as OverrideAccount, StarknetConfig, type StarknetConfigProps, StarkscanExplorer, UnsupportedAccountInterfaceError, type UseInjectedConnectorsProps, type UseInjectedConnectorsResult, UserNotConnectedError, UserRejectedRequestError, ViewblockExplorer, VoyagerExplorer, WalletRequestError, argent, braavos, cartridge, getAddress, injected, legacyInjected, ready, starknetChainId, starkscan, useInjectedConnectors, viewblock, voyager };
