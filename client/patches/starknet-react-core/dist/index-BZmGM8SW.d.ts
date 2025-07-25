import { Chain, Address } from '@starknet-react/chains';
import { ProviderInterface, PaymasterInterface, AccountInterface, BlockNumber, GetBlockResponse, Result as Result$1, Abi, Contract, ArgsOrCalldata, CallOptions, Call, CompiledContract, ContractFactory, RawArgs, BigNumberish, InvocationsDetails, DeployContractResponse, EstimateFeeDetails, EstimateFeeResponse, Nonce, GetTransactionReceiptResponse, BlockIdentifier as BlockIdentifier$1, PaymasterDetails, PaymasterFeeEstimate, TokenData, InvokeFunctionResponse } from 'starknet';
import { RpcMessage, RequestFnCall, RpcTypeToMessageMap, StarknetWindowObject, AddStarknetChainParameters, AddDeclareTransactionParameters, TypedData, SwitchStarknetChainParameters, WatchAssetParameters, Events } from '@starknet-io/types-js';
import EventEmitter from 'eventemitter3';
import { QueryKey, UseQueryOptions, UseQueryResult as UseQueryResult$1, UseMutationOptions, UseMutationResult as UseMutationResult$1, UseInfiniteQueryOptions, UseInfiniteQueryResult as UseInfiniteQueryResult$1, InfiniteData } from '@tanstack/react-query';
import { Abi as Abi$1 } from 'abi-wan-kanabi';
import { ContractFunctions, ExtractAbiFunctionNames, FunctionRet, ContractFunctionsPopulateTransaction, ExtractArgs, ExtractAbiFunction, Abi as Abi$2 } from 'abi-wan-kanabi/kanabi';

/** Connector icons, as base64 encoded svg. */
type ConnectorIcons = StarknetWindowObject["icon"];
/** Connector data. */
type ConnectorData = {
    /** Connector account. */
    account?: string;
    /** Connector network. */
    chainId?: bigint;
};
/** Connector events. */
interface ConnectorEvents {
    /** Emitted when account or network changes. */
    change(data: ConnectorData): void;
    /** Emitted when connection is established. */
    connect(data: ConnectorData): void;
    /** Emitted when connection is lost. */
    disconnect(): void;
}
type ConnectArgs = {
    chainIdHint?: bigint;
};
declare abstract class Connector extends EventEmitter<ConnectorEvents> {
    /** Unique connector id. */
    abstract get id(): string;
    /** Connector name. */
    abstract get name(): string;
    /** Connector icons. */
    abstract get icon(): ConnectorIcons;
    /** Whether connector is available for use */
    abstract available(): boolean;
    /** Whether connector is already authorized */
    abstract ready(): Promise<boolean>;
    /** Connect wallet. */
    abstract connect(args: ConnectArgs): Promise<ConnectorData>;
    /** Disconnect wallet. */
    abstract disconnect(): Promise<void>;
    /** Get current account. */
    abstract account(provider: ProviderInterface, paymasterProvider?: PaymasterInterface): Promise<AccountInterface>;
    /** Get current chain id. */
    abstract chainId(): Promise<bigint>;
    /** Create request call to wallet */
    abstract request<T extends RpcMessage["type"]>(call: RequestFnCall<T>): Promise<RpcTypeToMessageMap[T]["result"]>;
}

interface Explorer {
    block(hashOrNumber: {
        hash?: string;
        number?: number;
    }): string;
    transaction(hash: string): string;
    contract(address: string): string;
    class(hash: string): string;
    name: string;
}
type ExplorerFactory<T extends Explorer = Explorer> = (chain: Chain) => T | null;

/** Account connection status. */
type AccountStatus = "connected" | "disconnected" | "connecting" | "reconnecting";
/** Value returned from `useAccount`. */
type UseAccountResult = {
    /** The connected account object. */
    account?: AccountInterface;
    /** The address of the connected account. */
    address?: Address;
    /** The connected connector. */
    connector?: Connector;
    /** Connector's chain id */
    chainId?: bigint;
    /** True if connecting. */
    isConnecting?: boolean;
    /** True if reconnecting. */
    isReconnecting?: boolean;
    /** True if connected. */
    isConnected?: boolean;
    /** True if disconnected. */
    isDisconnected?: boolean;
    /** The connection status. */
    status: AccountStatus;
};
/**
 * Hook for accessing the account and its connection status.
 *
 * @remarks
 *
 * This hook is used to access the `AccountInterface` object provided by the
 * currently connected wallet.
 */
declare function useAccount(): UseAccountResult;

type UseQueryProps<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> = Pick<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "enabled" | "refetchInterval" | "retry" | "retryDelay">;
type UseQueryResult<TData, TError> = Pick<UseQueryResult$1<TData, TError>, "data" | "error" | "status" | "isSuccess" | "isError" | "isPending" | "fetchStatus" | "isFetching" | "isLoading" | "refetch">;
type UseMutationProps<TData = unknown, TError = unknown, TVariables = void, TContext = unknown> = Pick<UseMutationOptions<TData, TError, TVariables, TContext>, "onSuccess" | "onError" | "onMutate" | "onSettled">;
type UseMutationResult<TData = unknown, TError = unknown, TVariables = void, TContext = unknown> = Pick<UseMutationResult$1<TData, TError, TVariables, TContext>, "data" | "error" | "isError" | "isIdle" | "isPending" | "isPaused" | "isSuccess" | "reset" | "mutate" | "mutateAsync" | "status" | "variables">;
type UseInfiniteQueryProps<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData, TQueryData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown> = Pick<UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey, TPageParam>, "enabled" | "refetchInterval" | "retry" | "retryDelay">;
type UseInfiniteQueryResult<TData, TPageParam, TError> = Pick<UseInfiniteQueryResult$1<InfiniteData<TData, TPageParam>, TError>, "data" | "error" | "status" | "isSuccess" | "isError" | "isPending" | "fetchStatus" | "isFetching" | "isLoading" | "refetch" | "fetchNextPage" | "fetchPreviousPage" | "hasNextPage" | "hasPreviousPage" | "isFetchingNextPage" | "isFetchingPreviousPage">;

/** Message types for connector request call. */
type RequestMessageTypes = RpcMessage["type"];
/** Result type of request call. */
type RequestResult<T extends RequestMessageTypes> = RpcTypeToMessageMap[T]["result"];
/** Args type of request call. */
type RequestArgs<T extends RequestMessageTypes> = Partial<{
    type: T;
    params: RpcTypeToMessageMap[T]["params"];
}>;
type MutationResult$3<T extends RequestMessageTypes> = UseMutationResult<RpcTypeToMessageMap[T]["result"], Error, RequestArgs<T>>;
/** Arguments for `useWalletRequest` hook. */
type UseWalletRequestProps<T extends RequestMessageTypes> = RequestArgs<T> & UseMutationProps<RequestResult<T>, Error, RequestArgs<T>>;
/** Value returned from `useWalletRequest`. */
type UseWalletRequestResult<T extends RequestMessageTypes> = Omit<MutationResult$3<T>, "mutate" | "mutateAsync"> & {
    request: (args?: RequestArgs<T>) => void;
    requestAsync: (args?: RequestArgs<T>) => Promise<RequestResult<T>>;
};
/** Hook to perform request calls to connected wallet */
declare function useWalletRequest<T extends RequestMessageTypes>(props: UseWalletRequestProps<T>): UseWalletRequestResult<T>;

type UseAddChainArgs = AddStarknetChainParameters;
type UseAddChainProps = Omit<UseWalletRequestProps<"wallet_addStarknetChain">, keyof RequestArgs<"wallet_addStarknetChain">> & {
    params?: UseAddChainArgs;
};
type UseAddChainResult = Omit<UseWalletRequestResult<"wallet_addStarknetChain">, "request" | "requestAsync"> & {
    addChain: (args?: UseAddChainArgs) => void;
    addChainAsync: (args?: UseAddChainArgs) => Promise<RequestResult<"wallet_addStarknetChain">>;
};
/**
 * Hook to add a new network in the list of networks of the wallet.
 */
declare function useAddChain(props: UseAddChainProps): UseAddChainResult;

type Balance = {
    decimals: number;
    symbol: string;
    formatted: string;
    value: bigint;
};
type UseBalanceProps = UseQueryProps<Balance, Error, Balance, ReturnType<typeof queryKey$c>> & {
    /** The contract's address. Defaults to the native currency. */
    token?: Address;
    /** The address to fetch balance for. */
    address?: Address;
    /** Whether to watch for changes. */
    watch?: boolean;
    /** Block identifier used when performing call. */
    blockIdentifier?: BlockNumber;
};
type UseBalanceResult = UseQueryResult<Balance, Error>;
/**
 * Fetch the balance for the provided address and token.
 *
 * If no token is provided, the native currency is used.
 */
declare function useBalance({ token: token_, address, refetchInterval: refetchInterval_, watch, enabled: enabled_, blockIdentifier, ...props }: UseBalanceProps): UseQueryResult<{
    value: bigint;
    decimals: number;
    symbol: string;
    formatted: string;
}, Error>;
declare function queryKey$c({ chain, token, address, blockIdentifier, }: {
    chain: Chain;
    token?: string;
    address?: string;
    blockIdentifier?: BlockNumber;
}): readonly [{
    readonly entity: "balance";
    readonly chainId: string;
    readonly token: string | undefined;
    readonly address: string | undefined;
    readonly blockIdentifier: BlockNumber | undefined;
}];

/** Arguments for `useBlock`. */
type UseBlockProps = UseQueryProps<GetBlockResponse, Error, GetBlockResponse, ReturnType<typeof queryKey$b>> & {
    /** Identifier for the block to fetch. */
    blockIdentifier?: BlockNumber;
};
/** Value returned from `useBlock`. */
type UseBlockResult = UseQueryResult<GetBlockResponse, Error>;
/**
 * Hook for fetching a block.
 *
 * @remarks
 *
 * Specify which block to fetch with the `blockIdentifier` argument.
 * Control if and how often data is refreshed with `refetchInterval`.
 */
declare function useBlock({ blockIdentifier, ...props }?: UseBlockProps): UseBlockResult;
declare function queryKey$b({ blockIdentifier }: {
    blockIdentifier: BlockNumber;
}): readonly [{
    readonly entity: "block";
    readonly blockIdentifier: BlockNumber;
}];

/** Arguments for `useBlockNumber`. */
type UseBlockNumberProps = UseQueryProps<number | undefined, Error, number, ReturnType<typeof queryKey$a>> & {
    /** Identifier for the block to fetch. */
    blockIdentifier?: BlockNumber;
};
/** Value returned from `useBlockNumber`. */
type UseBlockNumberResult = UseQueryResult<number | undefined, Error>;
/**
 * Hook for fetching the current block number.
 *
 * @remarks
 *
 * Control if and how often data is refreshed with `refetchInterval`.
 */
declare function useBlockNumber({ blockIdentifier, ...props }?: UseBlockNumberProps): UseBlockNumberResult;
declare function queryKey$a({ blockIdentifier }: {
    blockIdentifier: BlockNumber;
}): readonly [{
    readonly entity: "blockNumber";
    readonly blockIdentifier: BlockNumber;
}];

type CallArgs = {
    /** The contract's function name. */
    functionName: string;
    /** Read arguments. */
    args?: ArgsOrCalldata;
    /** Block identifier used when performing call. */
    blockIdentifier?: BlockNumber;
    /** Parse arguments before passing to contract. @default true */
    parseArgs?: boolean;
    /** Parse result after calling contract. @default true */
    parseResult?: boolean;
};
type CallQueryKey = typeof queryKey$9;
/** Options for `useCall`. */
type UseCallProps = CallArgs & UseQueryProps<Result$1, Error, Result$1, ReturnType<CallQueryKey>> & {
    /** The target contract's ABI. */
    abi?: Abi;
    /** The target contract's address. */
    address?: Address;
    /** Refresh data at every block. */
    watch?: boolean;
};
/** Value returned from `useCall`. */
type UseCallResult = UseQueryResult<Result$1, Error>;
/**
 * Hook to perform a read-only contract call.
 *
 * @remarks
 *
 * The hook only performs a call if the target `abi`, `address`,
 * `functionName`, and `args` are not undefined.
 *
 */
declare function useCall({ abi, address, functionName, args, blockIdentifier, refetchInterval: refetchInterval_, watch, enabled: enabled_, parseArgs, parseResult, ...props }: UseCallProps): UseCallResult;
declare function queryKey$9({ chain, contract, functionName, args, blockIdentifier, }: {
    chain?: Chain;
    contract?: Contract;
} & CallArgs): readonly [{
    readonly entity: "readContract";
    readonly chainId: string | undefined;
    readonly contract: string | undefined;
    readonly functionName: string;
    readonly args: string;
    readonly blockIdentifier: BlockNumber | undefined;
}];

type ConnectVariables = {
    connector?: Connector;
};
type MutationResult$2 = UseMutationResult<void, Error, ConnectVariables>;
type UseConnectProps = UseMutationProps<void, Error, ConnectVariables>;
/** Value returned from `useConnect`. */
type UseConnectResult = Omit<MutationResult$2, "mutate" | "mutateAsync"> & {
    /** Current connector. */
    connector?: Connector;
    /** Connectors available for the current chain. */
    connectors: Connector[];
    /** Connector waiting approval for connection. */
    pendingConnector?: Connector;
    /** Connect to a new connector. */
    connect: (args?: ConnectVariables) => void;
    /** Connect to a new connector. */
    connectAsync: (args?: ConnectVariables) => Promise<void>;
};
/**
 * Hook for connecting to a StarkNet wallet.
 *
 * @remarks
 *
 * Use this to implement a "connect wallet" component.
 *
 * ```
 */
declare function useConnect(props?: UseConnectProps): UseConnectResult;

type Contract_ = {
    [K in keyof Contract as K extends "populate" | "populateTransaction" | "call" ? never : K]: Contract[K];
};
type ArgsArray_<TAbi extends Abi$1, TFunctionName extends ExtractAbiFunctionNames<TAbi>> = ExtractArgs<TAbi, ExtractAbiFunction<TAbi, TFunctionName>>;
type TypedContractActions_<TAbi extends Abi$1> = {
    call<TFunctionName extends ExtractAbiFunctionNames<TAbi>>(method: TFunctionName, args?: ArgsArray_<TAbi, TFunctionName>, options?: CallOptions): Promise<FunctionRet<TAbi, TFunctionName>>;
    populate<TFunctionName extends ExtractAbiFunctionNames<TAbi>>(method: TFunctionName, args?: ArgsArray_<TAbi, TFunctionName>): Call;
    populateTransaction: ContractFunctionsPopulateTransaction<TAbi>;
    /**
     * Returns same contract but typed and with the applied options for the next call.
     * @note if using `contract.withOptions(...).methodName()`, you must NOT pass options again in the `methodName(...argsOfMethodOnly)` as an argument.
     * @important You must apply the options again for each call
     */
    withOptions(options: CallOptions): StarknetTypedContract<TAbi>;
};
type TypedContract_<TAbi extends Abi$1> = TypedContractActions_<TAbi> & ContractFunctions<TAbi>;
type StarknetTypedContract<TAbi extends Abi$1> = TypedContract_<TAbi> & Contract_;
/** Arguments for `useContract`. */
interface UseContractArgs<TAbi extends Abi$1> {
    /** The contract abi
     * @remarks
     *
     * You must pass ABI as a const
     *
     * @example
     * abi: [
     *   {
     *     type: "function",
     *     name: "fn_simple_array",
     *     inputs: [
     *       {
     *         name: "arg",
     *         type: "core::array::Array::<core::integer::u8>",
     *       },
     *     ],
     *     outputs: [],
     *     state_mutability: "view",
     *   }
     *  ] as const
     *
     */
    abi?: TAbi;
    /** The contract address. */
    address?: Address;
    /** The provider, by default it will be the current one. */
    provider?: ProviderInterface | null;
}
/** Value returned from `useContract`. */
interface UseContractResult<TAbi extends Abi$1> {
    /** The contract. */
    contract?: StarknetTypedContract<TAbi>;
}
/**
 * Hook to bind a `Contract` instance.
 *
 * @remarks
 *
 * - The returned contract is a starknet.js `Contract` object.
 * - Must pass `abi` as const for strict type safety
 *
 */
declare function useContract<TAbi extends Abi$1>({ abi, address, provider: providedProvider, }: UseContractArgs<TAbi>): UseContractResult<TAbi>;

/** Arguments for `useContractFactory`. */
interface UseContractFactoryProps {
    /** The compiled contract. */
    compiledContract?: CompiledContract;
    /** The class hash  */
    classHash: string;
    /** The contract abi. */
    abi?: Abi;
}
/** Value returned from `useContractFactory`. */
interface UseContractFactoryResult {
    /** The contract factory. */
    contractFactory?: ContractFactory;
}
/**
 * Hook to create a `ContractFactory`.
 *
 * @remarks
 *
 * The returned contract factory is a starknet.js `ContractFactory` object.
 *
 * This hook works well with `useDeploy`.
 */
declare function useContractFactory({ compiledContract, classHash, abi, }: UseContractFactoryProps): UseContractFactoryResult;

type UseDeclareContractArgs = AddDeclareTransactionParameters;
type UseDeclareContractProps = Omit<UseWalletRequestProps<"wallet_addDeclareTransaction">, keyof RequestArgs<"wallet_addDeclareTransaction">> & {
    params?: UseDeclareContractArgs;
};
type UseDeclareContractResult = Omit<UseWalletRequestResult<"wallet_addDeclareTransaction">, "request" | "requestAsync"> & {
    declare: (args?: UseDeclareContractArgs) => void;
    declareAsync: (args?: UseDeclareContractArgs) => Promise<RequestResult<"wallet_addDeclareTransaction">>;
};
/**
 * Hook to declare a new class in the current network.
 *
 */
declare function useDeclareContract(props: UseDeclareContractProps): UseDeclareContractResult;

type DeployAccountVariables = {
    /** The class hash of the contract to deploy. */
    classHash?: string;
    /** The constructor arguments. */
    constructorCalldata?: RawArgs;
    /** Address salt. */
    addressSalt?: BigNumberish;
    /** Contract address. */
    contractAddress?: string;
    /** Transaction options. */
    options?: InvocationsDetails;
};
type UseDeployAccountProps = DeployAccountVariables & UseMutationProps<DeployContractResponse, Error, DeployAccountVariables>;
type MutationResult$1 = UseMutationResult<DeployContractResponse, Error, DeployAccountVariables>;
type UseDeployAccountResult = Omit<MutationResult$1, "mutate" | "mutateAsync"> & {
    /** Deploy account. */
    deployAccount: MutationResult$1["mutate"];
    /** Deploy account. */
    deployAccountAsync: MutationResult$1["mutateAsync"];
};
/**
 * Hook for deploying a contract.
 *
 * @remarks
 *
 * This hook deploys a new contract from the currently connected account.
 */
declare function useDeployAccount({ classHash, constructorCalldata, addressSalt, contractAddress, options, ...props }: UseDeployAccountProps): UseDeployAccountResult;

type MutationResult = UseMutationResult<void, Error, void>;
type UseDisconnectProps = UseMutationProps<void, Error, void>;
/** Value returned from `useDisconnect`. */
type UseDisconnectResult = Omit<MutationResult, "mutate" | "mutateAsync"> & {
    /** Disconnect wallet. */
    disconnect: MutationResult["mutate"];
    /** Disconnect wallet. */
    disconnectAsync: MutationResult["mutateAsync"];
};
/**
 *
 * Hook for disconnecting connected wallet.
 */
declare function useDisconnect(props?: UseDisconnectProps): UseDisconnectResult;

type EstimateFeesArgs = {
    /** List of smart contract calls to estimate. */
    calls?: Call[];
    /** Estimate Fee options. */
    options?: EstimateFeeDetails;
};
/** Options for `useEstimateFees`. */
type UseEstimateFeesProps = EstimateFeesArgs & UseQueryProps<EstimateFeeResponse, Error, EstimateFeeResponse, ReturnType<typeof queryKey$8>> & {
    /** Refresh data at every block. */
    watch?: boolean;
};
/** Value returned from `useEstimateFees`. */
type UseEstimateFeesResult = UseQueryResult<EstimateFeeResponse, Error>;
/**
 * Hook to estimate fees for smart contract calls.
 *
 * @remarks
 *
 * The hook only performs estimation if the `calls` is not undefined.
 */
declare function useEstimateFees({ calls, options, watch, enabled: enabled_, ...props }: UseEstimateFeesProps): UseEstimateFeesResult;
declare function queryKey$8({ calls, options }: EstimateFeesArgs): readonly [{
    readonly entity: "estimateInvokeFee";
    readonly calls: Call[] | undefined;
    readonly options: EstimateFeeDetails | undefined;
}];

/** Access the current explorer, should be inside a StarknetConfig. */
declare function useExplorer(): Explorer;

/**
 * Invalidate the given query on every new block.
 */
declare function useInvalidateOnBlock({ enabled, queryKey, }: {
    enabled?: boolean;
    queryKey: QueryKey;
}): void;

/** Value returned from `useNetwork`. */
type UseNetworkResult = {
    /** The current chain. */
    chain: Chain;
    /** List of supported chains. */
    chains: Chain[];
};
/**
 * Hook for accessing the current connected chain.
 *
 * @remarks
 *
 * The network object contains information about the
 * network.
 *
 */
declare function useNetwork(): UseNetworkResult;

/** Arguments for `useNonceForAddress`. */
type UseNonceForAddressProps = UseQueryProps<Nonce, Error, Nonce, ReturnType<typeof queryKey$7>> & {
    /** Address to fetch nonce for. */
    address: Address;
    /** Identifier for the block to fetch. */
    blockIdentifier?: BlockNumber;
};
/** Value returned from `useNonceForAddress`. */
type UseNonceForAddressResult = UseQueryResult<Nonce, Error>;
/**
 * Hook for fetching the nonce for the given address.
 */
declare function useNonceForAddress({ address, blockIdentifier, ...props }: UseNonceForAddressProps): UseNonceForAddressResult;
declare function queryKey$7({ address, blockIdentifier, }: {
    address: Address;
    blockIdentifier: BlockNumber;
}): readonly [{
    readonly entity: "nonce";
    readonly blockIdentifier: BlockNumber;
    readonly address: `0x${string}`;
}];

/** Value returned from `useProvider`. */
interface UseProviderResult {
    /** The current provider. */
    provider: ProviderInterface;
    /** The current paymaster provider. */
    paymasterProvider?: PaymasterInterface;
}
/**
 * Hook for accessing the current provider.
 *
 * @remarks
 *
 * Use this hook to access the current provider object
 * implementing starknet.js `ProviderInterface`.
 */
declare function useProvider(): UseProviderResult;

type Result<TAbi extends Abi$2, TFunctionName extends ExtractAbiFunctionNames<TAbi>> = FunctionRet<TAbi, TFunctionName>;
/** Options for `useReadContract`. */
type UseReadContractProps<TAbi extends Abi$2, TFunctionName extends ExtractAbiFunctionNames<TAbi>> = UseQueryProps<Result<TAbi, TFunctionName>, Error, Result<TAbi, TFunctionName>, ReturnType<CallQueryKey>> & {
    /** The target contract's ABI.
     *
     * @remarks
     *
     * You must pass ABI as const
     *
     */
    abi?: TAbi;
    /** The target contract's address. */
    address?: Address;
    /** Refresh data at every block. */
    watch?: boolean;
    /** The contract's function name. */
    functionName: TFunctionName;
    /** Read arguments. */
    args?: ExtractArgs<TAbi, ExtractAbiFunction<TAbi, TFunctionName>>;
    /** Block identifier used when performing call. */
    blockIdentifier?: BlockNumber;
};
/** Value returned from `useReadContract`. */
type UseReadContractResult<TAbi extends Abi$2, TFunctionName extends ExtractAbiFunctionNames<TAbi>> = UseQueryResult<Result<TAbi, TFunctionName>, Error>;
/**
 * Perform a read-only contract call. If the specified block identifier is pending,
 * the hook will periodically refetch data automatically.
 *
 * @remarks
 *
 * - The hook only performs a call if the target `abi`, `address`,
 * `functionName`, and `args` are not undefined.
 *
 * - You must pass `abi` as `const` for autocomplete to work.
 */
declare function useReadContract<TAbi extends Abi$2, TFunctionName extends ExtractAbiFunctionNames<TAbi>>(props: UseReadContractProps<TAbi, TFunctionName>): UseReadContractResult<TAbi, TFunctionName>;

type UseSendTransactionArgs = {
    /** List of smart contract calls to execute. */
    calls?: Call[];
};
type UseSendTransactionProps = UseSendTransactionArgs & Omit<UseWalletRequestProps<"wallet_addInvokeTransaction">, keyof RequestArgs<"wallet_addInvokeTransaction">>;
type UseSendTransactionResult = Omit<UseWalletRequestResult<"wallet_addInvokeTransaction">, "request" | "requestAsync"> & {
    send: (args?: Call[]) => void;
    sendAsync: (args?: Call[]) => Promise<RequestResult<"wallet_addInvokeTransaction">>;
};
/** Hook to send one or several transaction(s) to the network. */
declare function useSendTransaction(props: UseSendTransactionProps): UseSendTransactionResult;

type UseSignTypedDataArgs = TypedData;
type UseSignTypedDataProps = Omit<UseWalletRequestProps<"wallet_signTypedData">, keyof RequestArgs<"wallet_signTypedData">> & {
    params?: UseSignTypedDataArgs;
};
type UseSignTypedDataResult = Omit<UseWalletRequestResult<"wallet_signTypedData">, "request" | "requestAsync"> & {
    signTypedData: (args?: UseSignTypedDataArgs) => void;
    signTypedDataAsync: (args?: UseSignTypedDataArgs) => Promise<RequestResult<"wallet_signTypedData">>;
};
declare function useSignTypedData(props: UseSignTypedDataProps): UseSignTypedDataResult;

type UseStarkAddressProps = UseQueryProps<string, Error, string, ReturnType<typeof queryKey$6>> & {
    /** Stark name. */
    name?: string;
    /** Naming contract to use . */
    contract?: Address;
};
type UseStarkAddressResult = UseQueryResult<string, Error>;
/**
 * Hook to get the address associated to a stark name.
 *
 * @remarks
 *
 * This hook fetches the address of the specified stark name
 * It defaults to the starknetID contract but a different contract can be targetted by specifying its address
 * If stark name does not have an associated address, it will return "0x0"
 *
 */
declare function useStarkAddress({ name, contract, enabled: enabled_, ...props }: UseStarkAddressProps): UseStarkAddressResult;
declare function queryKey$6({ name, contract, network, }: {
    name?: string;
    contract?: string;
    network?: string;
}): readonly [{
    readonly entity: "addressFromStarkName";
    readonly name: string | undefined;
    readonly contract: string | undefined;
    readonly network: string | undefined;
}];

/** Arguments for `useStarkName` hook. */
type StarkNameArgs = UseQueryProps<string, Error, string, ReturnType<typeof queryKey$5>> & {
    /** Account address. */
    address?: Address;
    /** Naming contract to use . */
    contract?: Address;
};
/** Value returned by `useStarkName` hook. */
type StarkNameResult = UseQueryResult<string, Error>;
/**
 * Hook for fetching Stark name for address.
 *
 * @remarks
 *
 * This hook fetches the stark name of the specified address.
 * It defaults to the starknet.id contract but a different contract can be
 * targetted by specifying its contract address
 * If address does not have a stark name, it will return "stark"
 */
declare function useStarkName({ address, contract, enabled: enabled_, ...props }: StarkNameArgs): StarkNameResult;
declare function queryKey$5({ address, contract, network, }: {
    address?: string;
    contract?: string;
    network?: string;
}): readonly [{
    readonly entity: "starkName";
    readonly address: string | undefined;
    readonly contract: string | undefined;
    readonly network: string | undefined;
}];

/** Arguments for `useStarkProfile` hook. */
type StarkProfileArgs = UseQueryProps<GetStarkprofileResponse, Error, GetStarkprofileResponse, ReturnType<typeof queryKey$4>> & {
    /** Account address. */
    address?: Address;
    /** Get Starknet ID default pfp url if no profile picture is set */
    useDefaultPfp?: boolean;
    /** Naming contract to use. */
    namingContract?: Address;
    /** Identity contract to use. */
    identityContract?: Address;
};
/** Value returned by `useStarkProfile` hook. */
type GetStarkprofileResponse = {
    name?: string;
    /** Metadata url of the NFT set as profile picture. */
    profile?: string;
    /** Profile picture url. */
    profilePicture?: string;
    twitter?: string;
    github?: string;
    discord?: string;
    proofOfPersonhood: boolean;
};
type UseStarkProfileResult = UseQueryResult<GetStarkprofileResponse, Error>;
/**
 * Hook for fetching Stark profile for address.
 *
 * @remarks
 *
 * This hook fetches the stark name of the specified address, profile picture url,
 * social networks ids, and proof of personhood a user has set on its starknetid.
 * It defaults to the starknet.id naming and identity contracts but different contracts can be
 * targetted by specifying their contract addresses
 *
 */
declare function useStarkProfile({ address, useDefaultPfp, namingContract, identityContract, enabled: enabled_, ...props }: StarkProfileArgs): UseStarkProfileResult;
declare function queryKey$4({ address, namingContract, identityContract, network, useDefaultPfp, }: {
    address?: string;
    namingContract?: string;
    identityContract?: string;
    network?: string;
    useDefaultPfp?: boolean;
}): readonly [{
    readonly entity: "starkprofile";
    readonly address: string | undefined;
    readonly namingContract: string | undefined;
    readonly identityContract: string | undefined;
    readonly network: string | undefined;
    readonly useDefaultPfp: boolean | undefined;
}];

type UseSwitchChainArgs = SwitchStarknetChainParameters;
type UseSwitchChainProps = Omit<UseWalletRequestProps<"wallet_switchStarknetChain">, keyof RequestArgs<"wallet_switchStarknetChain">> & {
    params?: UseSwitchChainArgs;
};
type UseSwitchChainResult = Omit<UseWalletRequestResult<"wallet_switchStarknetChain">, "request" | "requestAsync"> & {
    switchChain: (args?: UseSwitchChainArgs) => void;
    switchChainAsync: (args?: UseSwitchChainArgs) => Promise<RequestResult<"wallet_switchStarknetChain">>;
};
/**
 * Hook to change the current network of the wallet.
 *
 */
declare function useSwitchChain(props: UseSwitchChainProps): UseSwitchChainResult;

/** Arguments for the `useTransactionReceipt` hook. */
type UseTransactionReceiptProps = UseQueryProps<GetTransactionReceiptResponse, Error, GetTransactionReceiptResponse, ReturnType<typeof queryKey$3>> & {
    /** The transaction hash. */
    hash?: string;
    /** Refresh data at every block. */
    watch?: boolean;
};
type UseTransactionReceiptResult = UseQueryResult<GetTransactionReceiptResponse, Error>;
/**
 * Hook to fetch a single transaction receipt.
 *
 * @remarks
 *
 * This hook keeps a cache of receipts by chain and transaction hash
 * so that you can use the hook freely in your application without worrying
 * about sending duplicate network requests.
 *
 * If you need to refresh the transaction receipt data, set `watch: true` in
 * the props. The hook will periodically refresh the transaction data in the
 * background.
 *
 */
declare function useTransactionReceipt({ hash, watch, enabled: enabled_, ...props }: UseTransactionReceiptProps): UseTransactionReceiptResult;
declare function queryKey$3({ chain, hash }: {
    chain?: Chain;
    hash?: string;
}): readonly [{
    readonly entity: "transactionReceipt";
    readonly chainId: string | undefined;
    readonly hash: string | undefined;
}];

type UseWatchAssetArgs = WatchAssetParameters;
type UseWatchAssetProps = Omit<UseWalletRequestProps<"wallet_watchAsset">, keyof RequestArgs<"wallet_watchAsset">> & {
    params?: UseWatchAssetArgs;
};
type UseWatchAssetResult = Omit<UseWalletRequestResult<"wallet_watchAsset">, "request" | "requestAsync"> & {
    watchAsset: (args?: UseWatchAssetArgs) => void;
    watchAssetAsync: (args?: UseWatchAssetArgs) => Promise<RequestResult<"wallet_watchAsset">>;
};
/**
 * Hook to watch an asset in the wallet.
 *
 */
declare function useWatchAsset(props: UseWatchAssetProps): UseWatchAssetResult;

type UseUniversalDeployerContractProps = {
    /** UDC contract's address.
     *
     * @remarks
     * Overrides the default address of the Universal Deployer contract.
     *
     */
    address?: Address;
    /** The provider, by default it will be the current one. */
    provider?: ProviderInterface | null;
};
type UseUniversalDeployerContractResult = {
    udc: UseContractResult<typeof abi>["contract"];
};
/**
 * Hook to bind a `Contract` instance for the Universal Deployer contract.
 *
 * @returns The `Contract` instance for the Universal Deployer contract.
 *
 * @remarks
 *
 * - The returned contract is a starknet.js `Contract` object.
 *
 */
declare function useUniversalDeployerContract(props?: UseUniversalDeployerContractProps): UseUniversalDeployerContractResult;
/**
 * https://docs.openzeppelin.com/contracts-cairo/0.20.0/udc
 * The Universal Deployer contract's ABI.
 */
declare const abi: readonly [{
    readonly name: "UniversalDeployerImpl";
    readonly type: "impl";
    readonly interface_name: "openzeppelin::utils::universal_deployer::interface::IUniversalDeployer";
}, {
    readonly name: "core::bool";
    readonly type: "enum";
    readonly variants: readonly [{
        readonly name: "False";
        readonly type: "()";
    }, {
        readonly name: "True";
        readonly type: "()";
    }];
}, {
    readonly name: "core::array::Span::<core::felt252>";
    readonly type: "struct";
    readonly members: readonly [{
        readonly name: "snapshot";
        readonly type: "@core::array::Array::<core::felt252>";
    }];
}, {
    readonly name: "openzeppelin::utils::universal_deployer::interface::IUniversalDeployer";
    readonly type: "interface";
    readonly items: readonly [{
        readonly name: "deploy_contract";
        readonly type: "function";
        readonly inputs: readonly [{
            readonly name: "class_hash";
            readonly type: "core::starknet::class_hash::ClassHash";
        }, {
            readonly name: "salt";
            readonly type: "core::felt252";
        }, {
            readonly name: "from_zero";
            readonly type: "core::bool";
        }, {
            readonly name: "calldata";
            readonly type: "core::array::Span::<core::felt252>";
        }];
        readonly outputs: readonly [{
            readonly type: "core::starknet::contract_address::ContractAddress";
        }];
        readonly state_mutability: "external";
    }];
}, {
    readonly kind: "struct";
    readonly name: "openzeppelin::presets::universal_deployer::UniversalDeployer::ContractDeployed";
    readonly type: "event";
    readonly members: readonly [{
        readonly kind: "data";
        readonly name: "address";
        readonly type: "core::starknet::contract_address::ContractAddress";
    }, {
        readonly kind: "data";
        readonly name: "deployer";
        readonly type: "core::starknet::contract_address::ContractAddress";
    }, {
        readonly kind: "data";
        readonly name: "from_zero";
        readonly type: "core::bool";
    }, {
        readonly kind: "data";
        readonly name: "class_hash";
        readonly type: "core::starknet::class_hash::ClassHash";
    }, {
        readonly kind: "data";
        readonly name: "calldata";
        readonly type: "core::array::Span::<core::felt252>";
    }, {
        readonly kind: "data";
        readonly name: "salt";
        readonly type: "core::felt252";
    }];
}, {
    readonly kind: "enum";
    readonly name: "openzeppelin::presets::universal_deployer::UniversalDeployer::Event";
    readonly type: "event";
    readonly variants: readonly [{
        readonly kind: "nested";
        readonly name: "ContractDeployed";
        readonly type: "openzeppelin::presets::universal_deployer::UniversalDeployer::ContractDeployed";
    }];
}];

type EventsType = Events;
type BlockIdentifier = Exclude<BlockIdentifier$1, bigint>;
/** Arguments for `useEvents`. */
type UseEventsProps = UseInfiniteQueryProps<EventsType, Error, EventsType, EventsType, ReturnType<typeof queryKey$2>, string> & {
    /** Filter events emitted by a specific contract address */
    address?: Address;
    /** Filter events using the event name, example: Transfer */
    eventName?: string;
    /** Start fetching events from this block */
    fromBlock?: BlockIdentifier;
    /** Stop fetching events at this block */
    toBlock?: BlockIdentifier;
    /** The number of events returned from each individual query */
    pageSize?: number;
};
/** Value returned from `useEvents`. */
type UseEventsResult = Omit<UseInfiniteQueryResult<EventsType, string, Error>, "fetchPreviousPage" | "isFetchingPreviousPage" | "hasPreviousPage">;
/**
 * Hook to fetch events continuously
 *
 * The parameters could be used to filter the events by contract address, name
 * or specify a range of blocks to get the events from
 *
 * The returned object contain different functions and props to fetch next pages
 */
declare function useEvents({ address, eventName, fromBlock: fromBlock_, toBlock: toBlock_, pageSize, }: UseEventsProps): UseEventsResult;
declare function queryKey$2({ address, eventName, fromBlock, toBlock, pageSize, }: {
    address?: Address;
    eventName?: string;
    fromBlock?: BlockIdentifier;
    toBlock?: BlockIdentifier;
    pageSize?: number;
}): readonly [{
    readonly entity: "events";
    readonly address: `0x${string}` | undefined;
    readonly eventName: string | undefined;
    readonly fromBlock: BlockIdentifier | undefined;
    readonly toBlock: BlockIdentifier | undefined;
    readonly pageSize: number | undefined;
}];

type PaymasterEstimateFeesArgs = {
    /** List of smart contract calls to estimate. */
    calls?: Call[];
    /** Estimate Fee options. */
    options: PaymasterDetails;
};
/** Options for `useEstimateFees`. */
type UsePaymasterEstimateFeesProps = PaymasterEstimateFeesArgs & UseQueryProps<PaymasterFeeEstimate, Error, PaymasterFeeEstimate, ReturnType<typeof queryKey$1>> & {
    /** Refresh data at every block. */
    watch?: boolean;
};
/** Value returned from `useEstimateFees`. */
type UsePaymasterEstimateFeesResult = UseQueryResult<PaymasterFeeEstimate, Error>;
/**
 * Hook to estimate fees for smart contract calls.
 *
 * @remarks
 *
 * The hook only performs estimation if the `calls` is not undefined.
 */
declare function usePaymasterEstimateFees({ calls, options, watch, enabled: enabled_, ...props }: UsePaymasterEstimateFeesProps): UsePaymasterEstimateFeesResult;
declare function queryKey$1({ calls, options }: PaymasterEstimateFeesArgs): readonly [{
    readonly entity: "estimatePaymasterTransactionFee";
    readonly calls: Call[] | undefined;
    readonly options: PaymasterDetails;
}];

/** Options for `usePaymasterGasTokens`. */
type UsePaymasterGasTokensProps = UseQueryProps<TokenData[], Error, TokenData[], ReturnType<typeof queryKey>> & {
    /** Refresh data at every block. */
    watch?: boolean;
};
/** Value returned from `usePaymasterGasTokens`. */
type UsePaymasterGasTokensResult = UseQueryResult<TokenData[], Error>;
/**
 * Hook to fetch all gas token supported by the Paymaster.
 *
 * @remarks
 *
 * The hook only performs fetch if the `paymasterProvider` is not undefined.
 */
declare function usePaymasterGasTokens({ watch, enabled: enabled_, ...props }?: UsePaymasterGasTokensProps): UsePaymasterGasTokensResult;
declare function queryKey(): readonly [{
    readonly entity: "paymaster_gasTokens";
}];

type UsePaymasterSendTransactionArgs = {
    /** List of smart contract calls to execute. */
    calls?: Call[];
    /** Paymaster details. */
    options: PaymasterDetails;
    /** Max fee in gas token. */
    maxFeeInGasToken?: BigNumberish;
};
/** Value returned from `usePaymasterSendTransaction`. */
type UsePaymasterSendTransactionResult = Omit<UseMutationResult<InvokeFunctionResponse, Error, Call[]>, "mutate" | "mutateAsync"> & {
    send: (args?: Call[]) => void;
    sendAsync: (args?: Call[]) => Promise<InvokeFunctionResponse>;
};
/** Hook to send one or several transaction(s) to the network through a paymaster. */
declare function usePaymasterSendTransaction(props: UsePaymasterSendTransactionArgs): UsePaymasterSendTransactionResult;

export { useExplorer as $, type AccountStatus as A, type Balance as B, type ConnectorIcons as C, type UseContractArgs as D, type Explorer as E, type UseContractResult as F, useContract as G, type UseContractFactoryProps as H, type UseContractFactoryResult as I, useContractFactory as J, type UseDeclareContractArgs as K, type UseDeclareContractProps as L, type UseDeclareContractResult as M, useDeclareContract as N, type DeployAccountVariables as O, type UseDeployAccountProps as P, type UseDeployAccountResult as Q, useDeployAccount as R, type StarknetTypedContract as S, type UseDisconnectProps as T, type UseAccountResult as U, type UseDisconnectResult as V, useDisconnect as W, type EstimateFeesArgs as X, type UseEstimateFeesProps as Y, type UseEstimateFeesResult as Z, useEstimateFees as _, Connector as a, useInvalidateOnBlock as a0, type UseNetworkResult as a1, useNetwork as a2, type UseNonceForAddressProps as a3, type UseNonceForAddressResult as a4, useNonceForAddress as a5, type UseProviderResult as a6, useProvider as a7, type UseReadContractProps as a8, type UseReadContractResult as a9, type RequestMessageTypes as aA, type RequestResult as aB, type RequestArgs as aC, type UseWalletRequestProps as aD, type UseWalletRequestResult as aE, useWalletRequest as aF, type UseWatchAssetArgs as aG, type UseWatchAssetProps as aH, type UseWatchAssetResult as aI, useWatchAsset as aJ, type UseUniversalDeployerContractProps as aK, type UseUniversalDeployerContractResult as aL, useUniversalDeployerContract as aM, type UseEventsProps as aN, type UseEventsResult as aO, useEvents as aP, type PaymasterEstimateFeesArgs as aQ, type UsePaymasterEstimateFeesProps as aR, type UsePaymasterEstimateFeesResult as aS, usePaymasterEstimateFees as aT, type UsePaymasterGasTokensProps as aU, type UsePaymasterGasTokensResult as aV, usePaymasterGasTokens as aW, type UsePaymasterSendTransactionArgs as aX, type UsePaymasterSendTransactionResult as aY, usePaymasterSendTransaction as aZ, useReadContract as aa, type UseSendTransactionArgs as ab, type UseSendTransactionProps as ac, type UseSendTransactionResult as ad, useSendTransaction as ae, type UseSignTypedDataArgs as af, type UseSignTypedDataProps as ag, type UseSignTypedDataResult as ah, useSignTypedData as ai, type UseStarkAddressProps as aj, type UseStarkAddressResult as ak, useStarkAddress as al, type StarkNameArgs as am, type StarkNameResult as an, useStarkName as ao, type StarkProfileArgs as ap, type GetStarkprofileResponse as aq, type UseStarkProfileResult as ar, useStarkProfile as as, type UseSwitchChainArgs as at, type UseSwitchChainProps as au, type UseSwitchChainResult as av, useSwitchChain as aw, type UseTransactionReceiptProps as ax, type UseTransactionReceiptResult as ay, useTransactionReceipt as az, type ConnectArgs as b, type ConnectorData as c, type ExplorerFactory as d, type UseAddChainArgs as e, type UseAddChainProps as f, type UseAddChainResult as g, useAddChain as h, type UseBalanceProps as i, type UseBalanceResult as j, useBalance as k, type UseBlockProps as l, type UseBlockResult as m, useBlock as n, type UseBlockNumberProps as o, type UseBlockNumberResult as p, useBlockNumber as q, type CallQueryKey as r, type UseCallProps as s, type UseCallResult as t, useAccount as u, useCall as v, type ConnectVariables as w, type UseConnectProps as x, type UseConnectResult as y, useConnect as z };
