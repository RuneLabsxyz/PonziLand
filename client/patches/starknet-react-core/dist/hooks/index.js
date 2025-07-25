// src/hooks/use-account.ts
import { useCallback as useCallback2, useEffect as useEffect2, useState as useState2 } from "react";

// src/context/account.tsx
import React, { useContext } from "react";
import { jsx } from "react/jsx-runtime";
var AccountContext = React.createContext({
  account: void 0,
  address: void 0
});
function useStarknetAccount() {
  const { account, address } = useContext(AccountContext);
  return { account, address };
}

// src/context/starknet.tsx
import {
  mainnet,
  sepolia
} from "@starknet-react/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext as useContext2,
  useEffect,
  useRef,
  useState
} from "react";
import {
  constants
} from "starknet";

// src/providers/paymaster/paymasterrpc.ts
import { PaymasterRpc } from "starknet";

// src/context/starknet.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var defaultQueryClient = new QueryClient();
var StarknetContext = createContext(void 0);
function useStarknet() {
  const state = useContext2(StarknetContext);
  if (!state) {
    throw new Error(
      "useStarknet must be used within a StarknetProvider or StarknetConfig"
    );
  }
  return state;
}

// src/utils.ts
import { validateAndParseAddress } from "starknet";
function getAddress(address) {
  return validateAndParseAddress(address);
}

// src/hooks/use-provider.ts
function useProvider() {
  const { provider, paymasterProvider } = useStarknet();
  return { provider, paymasterProvider };
}

// src/hooks/use-account.ts
function useAccount() {
  const { connector, chain } = useStarknet();
  const { provider, paymasterProvider } = useProvider();
  const { address: connectedAddress } = useStarknetAccount();
  const [state, setState] = useState2(
    connectedAddress === void 0 ? {
      status: "disconnected"
    } : {
      status: "connected",
      connector,
      chainId: chain.id,
      account: void 0,
      address: getAddress(connectedAddress),
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      isReconnecting: false
    }
  );
  const refreshState = useCallback2(async () => {
    if (connector && provider && connectedAddress) {
      setState({
        status: "connected",
        connector,
        chainId: chain.id,
        account: void 0,
        address: getAddress(connectedAddress),
        isConnected: true,
        isConnecting: false,
        isDisconnected: false,
        isReconnecting: false
      });
      connector.account(provider, paymasterProvider).then(
        (connectedAccount) => setState((state2) => ({ ...state2, account: connectedAccount }))
      );
    } else {
      return setState({
        status: "disconnected",
        connector: void 0,
        chainId: void 0,
        account: void 0,
        address: void 0,
        isConnected: false,
        isConnecting: false,
        isDisconnected: true,
        isReconnecting: false
      });
    }
  }, [provider, paymasterProvider, connector, chain.id, connectedAddress]);
  useEffect2(() => {
    refreshState();
  }, [refreshState]);
  return state;
}

// src/hooks/use-wallet-request.ts
import { useCallback as useCallback3 } from "react";

// src/query.ts
import {
  useInfiniteQuery as useInfiniteQuery_,
  useMutation as useMutation_,
  useQuery as useQuery_
} from "@tanstack/react-query";
function useQuery(args) {
  const base = useQuery_({ ...args, structuralSharing: false });
  return {
    data: base.data,
    error: base.error,
    status: base.status,
    isSuccess: base.isSuccess,
    isError: base.isError,
    isPending: base.isPending,
    fetchStatus: base.fetchStatus,
    isFetching: base.isFetching,
    isLoading: base.isLoading,
    refetch: base.refetch
  };
}
function useMutation(args) {
  const base = useMutation_(args);
  return {
    data: base.data,
    error: base.error,
    reset: base.reset,
    isError: base.isError,
    isIdle: base.isIdle,
    isPending: base.isPending,
    isSuccess: base.isSuccess,
    isPaused: base.isPaused,
    mutate: base.mutate,
    mutateAsync: base.mutateAsync,
    status: base.status,
    variables: base.variables
  };
}
function useInfiniteQuery(args) {
  const base = useInfiniteQuery_({ ...args, structuralSharing: false });
  return {
    data: base.data,
    error: base.error,
    status: base.status,
    isSuccess: base.isSuccess,
    isError: base.isError,
    isPending: base.isPending,
    fetchStatus: base.fetchStatus,
    isFetching: base.isFetching,
    isLoading: base.isLoading,
    refetch: base.refetch,
    fetchNextPage: base.fetchNextPage,
    fetchPreviousPage: base.fetchPreviousPage,
    hasNextPage: base.hasNextPage,
    hasPreviousPage: base.hasPreviousPage,
    isFetchingNextPage: base.isFetchingNextPage,
    isFetchingPreviousPage: base.isFetchingPreviousPage
  };
}

// src/hooks/use-wallet-request.ts
function useWalletRequest(props) {
  const { connector } = useStarknet();
  const { type, params, ...rest } = props;
  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: mutationKey({ type, params }),
    mutationFn: mutationFn({ connector }),
    ...rest
  });
  const request = useCallback3(
    (args) => mutate(args ?? { type, params }),
    [mutate, type, params]
  );
  const requestAsync = useCallback3(
    (args) => mutateAsync(args ?? { type, params }),
    [mutateAsync, type, params]
  );
  return {
    request,
    requestAsync,
    ...result
  };
}
function mutationKey({
  type,
  params
}) {
  return [{ entity: "walletRequest", type, params }];
}
function mutationFn({
  connector
}) {
  return async ({ type, params }) => {
    if (!connector) throw new Error("No connector connected");
    if (!type) throw new Error("Type is required");
    return await connector.request({ type, params });
  };
}

// src/hooks/use-add-chain.ts
function useAddChain(props) {
  const { params, ...rest } = props;
  const { request, requestAsync, ...result } = useWalletRequest({
    type: "wallet_addStarknetChain",
    params,
    ...rest
  });
  const addChain = (args) => {
    return request(
      args ? {
        params: args,
        type: "wallet_addStarknetChain"
      } : void 0
    );
  };
  const addChainAsync = (args) => {
    return requestAsync(
      args ? {
        params: args,
        type: "wallet_addStarknetChain"
      } : void 0
    );
  };
  return {
    addChain,
    addChainAsync,
    ...result
  };
}

// src/hooks/use-balance.ts
import { useMemo as useMemo2 } from "react";
import {
  BlockTag as BlockTag2,
  num,
  shortString
} from "starknet";
import { formatUnits } from "viem";

// src/hooks/use-contract.ts
import { useMemo } from "react";
import {
  Contract
} from "starknet";
function useContract({
  abi: abi2,
  address,
  provider: providedProvider
}) {
  const { provider: currentProvider } = useStarknet();
  const contract = useMemo(() => {
    const provider = providedProvider ? providedProvider : currentProvider;
    if (abi2 && address && provider) {
      return new Contract(abi2, address, provider).typedv2(
        abi2
      );
    }
    return void 0;
  }, [abi2, address, providedProvider, currentProvider]);
  return { contract };
}

// src/hooks/use-invalidate-on-block.ts
import { useQueryClient } from "@tanstack/react-query";
import { useEffect as useEffect3, useState as useState3 } from "react";

// src/hooks/use-block-number.ts
import { BlockTag } from "starknet";
function useBlockNumber({
  blockIdentifier = BlockTag.LATEST,
  ...props
} = {}) {
  const { provider } = useStarknet();
  return useQuery({
    queryKey: queryKey({ blockIdentifier }),
    queryFn: queryFn({ provider, blockIdentifier }),
    ...props
  });
}
function queryKey({ blockIdentifier }) {
  return [{ entity: "blockNumber", blockIdentifier }];
}
function queryFn({
  provider,
  blockIdentifier
}) {
  return async () => {
    const block = await provider.getBlock(blockIdentifier);
    if (block.status !== "PENDING") {
      return block.block_number;
    }
    return void 0;
  };
}

// src/hooks/use-invalidate-on-block.ts
function useInvalidateOnBlock({
  enabled = true,
  queryKey: queryKey14
}) {
  const queryClient = useQueryClient();
  const [prevBlockNumber, setPrevBlockNumber] = useState3();
  const { data: blockNumber } = useBlockNumber({
    enabled
  });
  useEffect3(() => {
    if (!prevBlockNumber) {
      return setPrevBlockNumber(blockNumber);
    }
    if (blockNumber !== prevBlockNumber) {
      queryClient.invalidateQueries({ queryKey: queryKey14 }, { cancelRefetch: false });
      return setPrevBlockNumber(blockNumber);
    }
  }, [blockNumber, prevBlockNumber, queryKey14, queryClient]);
}

// src/hooks/use-network.ts
function useNetwork() {
  const { chain, chains } = useStarknet();
  return { chain, chains };
}

// src/hooks/use-balance.ts
var DEFAULT_FETCH_INTERVAL = 5e3;
function useBalance({
  token: token_,
  address,
  refetchInterval: refetchInterval_,
  watch = false,
  enabled: enabled_ = true,
  blockIdentifier = BlockTag2.LATEST,
  ...props
}) {
  const { chain } = useNetwork();
  const token = token_ ?? chain.nativeCurrency.address;
  const { contract } = useContract({
    abi: balanceABIFragment,
    address: token
  });
  const queryKey_ = useMemo2(
    () => queryKey2({ chain, token, address, blockIdentifier }),
    [chain, token, address, blockIdentifier]
  );
  const enabled = useMemo2(
    () => Boolean(enabled_ && contract && address),
    [enabled_, contract, address]
  );
  const refetchInterval = refetchInterval_ ?? (blockIdentifier === BlockTag2.PENDING && watch ? DEFAULT_FETCH_INTERVAL : void 0);
  useInvalidateOnBlock({
    enabled: Boolean(enabled && watch),
    queryKey: queryKey_
  });
  return useQuery({
    enabled,
    refetchInterval,
    queryKey: queryKey_,
    queryFn: queryFn2({ chain, contract, token, address, blockIdentifier }),
    ...props
  });
}
function queryKey2({
  chain,
  token,
  address,
  blockIdentifier
}) {
  return [
    {
      entity: "balance",
      chainId: chain?.name,
      token,
      address,
      blockIdentifier
    }
  ];
}
function queryFn2({
  chain,
  token,
  address,
  contract,
  blockIdentifier
}) {
  return async () => {
    if (!address) throw new Error("address is required");
    if (!contract) throw new Error("contract is required");
    const options = {
      blockIdentifier
    };
    const isNativeCurrency = token === chain.nativeCurrency.address;
    let symbol = chain.nativeCurrency.symbol;
    if (!isNativeCurrency) {
      const symbol_ = await contract.withOptions(options).symbol();
      symbol = shortString.decodeShortString(num.toHex(symbol_));
    }
    let decimals = chain.nativeCurrency.decimals;
    if (!isNativeCurrency) {
      const decimals_ = await contract.withOptions(options).decimals();
      decimals = Number(decimals_);
    }
    const balanceOf = await contract.withOptions(options).balanceOf(address);
    const formatted = formatUnits(balanceOf, decimals);
    return {
      value: balanceOf,
      decimals,
      symbol,
      formatted
    };
  };
}
var balanceABIFragment = [
  {
    name: "core::integer::u256",
    type: "struct",
    members: [
      {
        name: "low",
        type: "core::integer::u128"
      },
      {
        name: "high",
        type: "core::integer::u128"
      }
    ]
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ],
    outputs: [
      {
        type: "core::integer::u256"
      }
    ],
    state_mutability: "view"
  },
  {
    name: "symbol",
    type: "function",
    inputs: [],
    outputs: [
      {
        type: "core::felt252"
      }
    ],
    state_mutability: "view"
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [
      {
        type: "core::integer::u8"
      }
    ],
    state_mutability: "view"
  }
];

// src/hooks/use-block.ts
import {
  BlockTag as BlockTag3
} from "starknet";
function useBlock({
  blockIdentifier = BlockTag3.LATEST,
  ...props
} = {}) {
  const { provider } = useStarknet();
  return useQuery({
    queryKey: queryKey3({ blockIdentifier }),
    queryFn: queryFn3({ provider, blockIdentifier }),
    ...props
  });
}
function queryKey3({ blockIdentifier }) {
  return [{ entity: "block", blockIdentifier }];
}
function queryFn3({
  provider,
  blockIdentifier
}) {
  return async () => await provider.getBlock(blockIdentifier);
}

// src/hooks/use-call.ts
import { useMemo as useMemo3 } from "react";
import {
  BlockTag as BlockTag4
} from "starknet";
var DEFAULT_FETCH_INTERVAL2 = 5e3;
function useCall({
  abi: abi2,
  address,
  functionName,
  args,
  blockIdentifier = BlockTag4.LATEST,
  refetchInterval: refetchInterval_,
  watch = false,
  enabled: enabled_ = true,
  parseArgs,
  parseResult,
  ...props
}) {
  const { chain } = useNetwork();
  const { contract } = useContract({ abi: abi2, address });
  const queryKey_ = useMemo3(
    () => queryKey4({
      chain,
      contract,
      functionName,
      args,
      blockIdentifier
    }),
    [chain, contract, functionName, args, blockIdentifier]
  );
  const enabled = useMemo3(
    () => Boolean(enabled_ && contract && functionName && args),
    [enabled_, contract, functionName, args]
  );
  const refetchInterval = refetchInterval_ ?? (blockIdentifier === BlockTag4.PENDING && watch ? DEFAULT_FETCH_INTERVAL2 : void 0);
  useInvalidateOnBlock({
    enabled: Boolean(enabled && watch),
    queryKey: queryKey_
  });
  return useQuery({
    queryKey: queryKey_,
    queryFn: queryFn4({
      contract,
      functionName,
      args,
      blockIdentifier,
      parseArgs,
      parseResult
    }),
    refetchInterval,
    enabled,
    ...props
  });
}
function queryKey4({
  chain,
  contract,
  functionName,
  args,
  blockIdentifier
}) {
  return [
    {
      entity: "readContract",
      chainId: chain?.name,
      contract: contract?.address,
      functionName,
      args: JSON.stringify(
        args,
        (_, v) => typeof v === "bigint" ? v.toString(10) : v
      ),
      blockIdentifier
    }
  ];
}
function queryFn4({
  contract,
  functionName,
  args,
  blockIdentifier,
  parseArgs = true,
  parseResult = true
}) {
  return async () => {
    if (!contract) throw new Error("contract is required");
    if (contract.functions[functionName] === void 0) {
      throw new Error(`function ${functionName} not found in contract`);
    }
    return contract.call(functionName, args, {
      parseRequest: parseArgs,
      parseResponse: parseResult,
      blockIdentifier
    });
  };
}

// src/hooks/use-connect.ts
import { useCallback as useCallback4 } from "react";
function useConnect(props = {}) {
  const { connector, connectors, connect: connect_, chain } = useStarknet();
  const { mutate, mutateAsync, variables, ...result } = useMutation({
    mutationKey: [{ entity: "connect", chainId: chain.name }],
    mutationFn: connect_,
    ...props
  });
  const connect = useCallback4(
    (args) => mutate(args ?? { connector }),
    [mutate, connector]
  );
  const connectAsync = useCallback4(
    (args) => mutateAsync(args ?? { connector }),
    [mutateAsync, connector]
  );
  return {
    connector,
    connectors,
    pendingConnector: variables?.connector,
    connect,
    connectAsync,
    variables,
    ...result
  };
}

// src/hooks/use-contract-factory.ts
import { useMemo as useMemo4 } from "react";
import { ContractFactory } from "starknet";
function useContractFactory({
  compiledContract,
  classHash,
  abi: abi2
}) {
  const { account } = useAccount();
  const contractFactory = useMemo4(() => {
    if (compiledContract && account && classHash) {
      return new ContractFactory({
        compiledContract,
        classHash,
        account,
        abi: abi2
      });
    }
    return void 0;
  }, [compiledContract, classHash, account, abi2]);
  return { contractFactory };
}

// src/hooks/use-declare-contract.ts
function useDeclareContract(props) {
  const { params, ...rest } = props;
  const { request, requestAsync, ...result } = useWalletRequest({
    type: "wallet_addDeclareTransaction",
    params,
    ...rest
  });
  const declare = (args) => {
    return request(
      args ? {
        params: args,
        type: "wallet_addDeclareTransaction"
      } : void 0
    );
  };
  const declareAsync = (args) => {
    return requestAsync(
      args ? {
        params: args,
        type: "wallet_addDeclareTransaction"
      } : void 0
    );
  };
  return {
    declare,
    declareAsync,
    ...result
  };
}

// src/hooks/use-deploy-account.ts
function useDeployAccount({
  classHash,
  constructorCalldata,
  addressSalt,
  contractAddress,
  options,
  ...props
}) {
  const { account } = useAccount();
  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: mutationKey2({
      account,
      classHash,
      constructorCalldata,
      addressSalt,
      contractAddress,
      options
    }),
    mutationFn: mutationFn2({
      account,
      classHash,
      constructorCalldata,
      addressSalt,
      contractAddress,
      options
    }),
    ...props
  });
  return {
    deployAccount: mutate,
    deployAccountAsync: mutateAsync,
    ...result
  };
}
function mutationKey2(props) {
  return [{ entity: "deployAccount", ...props }];
}
function mutationFn2({
  account,
  classHash,
  constructorCalldata,
  addressSalt,
  contractAddress,
  options
}) {
  return async () => {
    if (!account) throw new Error("account is required");
    if (!classHash) throw new Error("classHash is required");
    return await account.deployAccount(
      { classHash, constructorCalldata, addressSalt, contractAddress },
      options
    );
  };
}

// src/hooks/use-disconnect.ts
function useDisconnect(props = {}) {
  const { disconnect, chain } = useStarknet();
  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: [{ entity: "disconnect", chainId: chain.name }],
    mutationFn: disconnect,
    ...props
  });
  return {
    disconnect: mutate,
    disconnectAsync: mutateAsync,
    ...result
  };
}

// src/hooks/use-estimate-fees.ts
import { useMemo as useMemo5 } from "react";
function useEstimateFees({
  calls,
  options,
  watch = false,
  enabled: enabled_ = true,
  ...props
}) {
  const { account } = useAccount();
  const queryKey_ = useMemo5(
    () => queryKey5({ calls, options }),
    [calls, options]
  );
  const enabled = useMemo5(() => Boolean(enabled_ && calls), [enabled_, calls]);
  useInvalidateOnBlock({
    enabled: Boolean(enabled && watch),
    queryKey: queryKey_
  });
  return useQuery({
    queryKey: queryKey_,
    queryFn: queryFn5({
      account,
      calls,
      options
    }),
    enabled,
    ...props
  });
}
function queryKey5({ calls, options }) {
  return [
    {
      entity: "estimateInvokeFee",
      calls,
      options
    }
  ];
}
function queryFn5({
  account,
  calls,
  options
}) {
  return async () => {
    if (!account) throw new Error("account is required");
    if (!calls || calls.length === 0) throw new Error("calls are required");
    return await account.estimateInvokeFee(calls, options);
  };
}

// src/hooks/use-explorer.ts
function useExplorer() {
  const { explorer, chain } = useStarknet();
  if (!explorer)
    throw Error("Explorer is undefined. Try adding it to StarknetConfig.");
  const explorerInstance = explorer(chain);
  if (!explorerInstance) throw Error("Explorer Instance is undefined");
  return explorerInstance;
}

// src/hooks/use-nonce-for-address.ts
import {
  BlockTag as BlockTag5
} from "starknet";
function useNonceForAddress({
  address,
  blockIdentifier = BlockTag5.LATEST,
  ...props
}) {
  const { provider } = useStarknet();
  return useQuery({
    queryKey: queryKey6({ address, blockIdentifier }),
    queryFn: queryFn6({ address, provider, blockIdentifier }),
    ...props
  });
}
function queryKey6({
  address,
  blockIdentifier
}) {
  return [{ entity: "nonce", blockIdentifier, address }];
}
function queryFn6({
  provider,
  blockIdentifier,
  address
}) {
  return async () => {
    const nonce = await provider.getNonceForAddress(address, blockIdentifier);
    return nonce;
  };
}

// src/hooks/use-read-contract.ts
function useReadContract(props) {
  return useCall(props);
}

// src/hooks/use-send-transaction.ts
function useSendTransaction(props) {
  const { calls, ...rest } = props;
  const params = calls ? { calls: transformCalls(calls) } : void 0;
  const { request, requestAsync, ...result } = useWalletRequest({
    type: "wallet_addInvokeTransaction",
    params,
    ...rest
  });
  const send = (args) => {
    return request(
      args ? {
        params: { calls: transformCalls(args) },
        type: "wallet_addInvokeTransaction"
      } : void 0
    );
  };
  const sendAsync = (args) => {
    return requestAsync(
      args ? {
        params: { calls: transformCalls(args) },
        type: "wallet_addInvokeTransaction"
      } : void 0
    );
  };
  return {
    send,
    sendAsync,
    ...result
  };
}
function transformCalls(calls) {
  return calls.map(
    (call) => ({
      contract_address: call.contractAddress,
      entry_point: call.entrypoint,
      calldata: call.calldata
    })
  );
}

// src/hooks/use-sign.ts
function useSignTypedData(props) {
  const { params, ...rest } = props;
  const { request, requestAsync, ...result } = useWalletRequest({
    type: "wallet_signTypedData",
    params,
    ...rest
  });
  const signTypedData = (args) => {
    return request(
      args ? {
        params: args,
        type: "wallet_signTypedData"
      } : void 0
    );
  };
  const signTypedDataAsync = (args) => {
    return requestAsync(
      args ? {
        params: args,
        type: "wallet_signTypedData"
      } : void 0
    );
  };
  return {
    signTypedData,
    signTypedDataAsync,
    ...result
  };
}

// src/hooks/use-stark-address.ts
import { useMemo as useMemo6 } from "react";
import {
  CallData,
  Provider,
  starknetId
} from "starknet";
function useStarkAddress({
  name,
  contract,
  enabled: enabled_ = true,
  ...props
}) {
  const { provider } = useProvider();
  const { chain } = useNetwork();
  const enabled = useMemo6(() => Boolean(enabled_ && name), [enabled_, name]);
  return useQuery({
    queryKey: queryKey7({ name, contract, network: chain.network }),
    queryFn: queryFn7({ name, contract, provider, network: chain.network }),
    enabled,
    ...props
  });
}
function queryKey7({
  name,
  contract,
  network
}) {
  return [{ entity: "addressFromStarkName", name, contract, network }];
}
function queryFn7({
  name,
  contract,
  provider,
  network
}) {
  return async () => {
    if (!name) throw new Error("name is required");
    const namingContract = contract ?? StarknetIdNamingContract[network];
    const p = new Provider(provider);
    const encodedDomain = encodeDomain(name);
    const result = await p.callContract({
      contractAddress: namingContract,
      entrypoint: "domain_to_address",
      calldata: CallData.compile({ domain: encodedDomain, hint: [] })
    });
    if (BigInt(result[0]) === BigInt(0)) throw new Error("Address not found");
    return result[0];
  };
}
var StarknetIdNamingContract = {
  sepolia: "0x154bc2e1af9260b9e66af0e9c46fc757ff893b3ff6a85718a810baf1474",
  mainnet: "0x6ac597f8116f886fa1c97a23fa4e08299975ecaf6b598873ca6792b9bbfb678"
};
var encodeDomain = (domain) => {
  if (!domain) return ["0"];
  const encoded = [];
  for (const subdomain of domain.replace(".stark", "").split("."))
    encoded.push(starknetId.useEncoded(subdomain).toString(10));
  return encoded;
};

// src/hooks/use-stark-name.ts
import { useMemo as useMemo7 } from "react";
import { Provider as Provider2 } from "starknet";
function useStarkName({
  address,
  contract,
  enabled: enabled_ = true,
  ...props
}) {
  const { provider } = useProvider();
  const { chain } = useNetwork();
  const enabled = useMemo7(
    () => Boolean(enabled_ && address),
    [enabled_, address]
  );
  return useQuery({
    queryKey: queryKey8({ address, contract, network: chain.network }),
    queryFn: queryFn8({ address, contract, provider, network: chain.network }),
    enabled,
    ...props
  });
}
function queryKey8({
  address,
  contract,
  network
}) {
  return [{ entity: "starkName", address, contract, network }];
}
function queryFn8({
  address,
  contract,
  provider,
  network
}) {
  return async () => {
    if (!address) throw new Error("address is required");
    const namingContract = contract ?? StarknetIdNamingContract2[network];
    const p = new Provider2(provider);
    return await p.getStarkName(address, namingContract);
  };
}
var StarknetIdNamingContract2 = {
  sepolia: "0x154bc2e1af9260b9e66af0e9c46fc757ff893b3ff6a85718a810baf1474",
  mainnet: "0x6ac597f8116f886fa1c97a23fa4e08299975ecaf6b598873ca6792b9bbfb678"
};

// src/hooks/use-stark-profile.ts
import { useMemo as useMemo8 } from "react";
import {
  CairoCustomEnum,
  cairo,
  hash,
  shortString as shortString2,
  starknetId as starknetId2
} from "starknet";
function useStarkProfile({
  address,
  useDefaultPfp = true,
  namingContract,
  identityContract,
  enabled: enabled_ = true,
  ...props
}) {
  const { provider } = useProvider();
  const { chain } = useNetwork();
  if (!StarknetIdcontracts[chain.network])
    throw new Error("Network not supported");
  const { contract: multicallContract } = useContract({
    abi: multicallABI,
    address: StarknetIdcontracts[chain.network]["multicall"]
  });
  const enabled = useMemo8(
    () => Boolean(enabled_ && address),
    [enabled_, address]
  );
  const { refetchInterval, ...rest } = props;
  return useQuery({
    queryKey: queryKey9({
      address,
      namingContract,
      identityContract,
      network: chain.network,
      useDefaultPfp
    }),
    queryFn: queryFn9({
      address,
      useDefaultPfp,
      namingContract,
      network: chain.network,
      identityContract,
      multicallContract
    }),
    enabled,
    refetchInterval,
    ...rest
  });
}
function queryKey9({
  address,
  namingContract,
  identityContract,
  network,
  useDefaultPfp
}) {
  return [
    {
      entity: "starkprofile",
      address,
      namingContract,
      identityContract,
      network,
      useDefaultPfp
    }
  ];
}
function queryFn9({
  address,
  useDefaultPfp,
  namingContract,
  identityContract,
  network,
  multicallContract
}) {
  return async () => {
    if (!address) throw new Error("address is required");
    if (!multicallContract) throw new Error("multicallContract is required");
    if (!network) throw new Error("network is required");
    const contracts = StarknetIdcontracts[network];
    const identity = identityContract ?? contracts["identity"];
    const naming = namingContract ?? contracts["naming"];
    const data = await multicallContract.call("aggregate", [
      [
        {
          execution: staticExecution(),
          to: hardcoded(naming),
          selector: hardcoded(hash.getSelectorFromName("address_to_domain")),
          calldata: [hardcoded(address), hardcoded(0)]
        },
        {
          execution: staticExecution(),
          to: hardcoded(naming),
          selector: hardcoded(hash.getSelectorFromName("domain_to_id")),
          calldata: [arrayReference(0, 0)]
        },
        {
          execution: staticExecution(),
          to: hardcoded(identity),
          selector: hardcoded(hash.getSelectorFromName("get_verifier_data")),
          calldata: [
            reference(1, 0),
            hardcoded(shortString2.encodeShortString("twitter")),
            hardcoded(contracts["verifier"]),
            hardcoded("0")
          ]
        },
        {
          execution: staticExecution(),
          to: hardcoded(identity),
          selector: hardcoded(hash.getSelectorFromName("get_verifier_data")),
          calldata: [
            reference(1, 0),
            hardcoded(shortString2.encodeShortString("github")),
            hardcoded(contracts["verifier"]),
            hardcoded("0")
          ]
        },
        {
          execution: staticExecution(),
          to: hardcoded(identity),
          selector: hardcoded(hash.getSelectorFromName("get_verifier_data")),
          calldata: [
            reference(1, 0),
            hardcoded(shortString2.encodeShortString("discord")),
            hardcoded(contracts["verifier"]),
            hardcoded("0")
          ]
        },
        {
          execution: staticExecution(),
          to: hardcoded(identity),
          selector: hardcoded(hash.getSelectorFromName("get_verifier_data")),
          calldata: [
            reference(1, 0),
            hardcoded(shortString2.encodeShortString("proof_of_personhood")),
            hardcoded(contracts["verifier_pop"]),
            hardcoded("0")
          ]
        },
        // PFP
        {
          execution: staticExecution(),
          to: hardcoded(identity),
          selector: hardcoded(hash.getSelectorFromName("get_verifier_data")),
          calldata: [
            reference(1, 0),
            hardcoded(shortString2.encodeShortString("nft_pp_contract")),
            hardcoded(contracts["verifier_pfp"]),
            hardcoded("0")
          ]
        },
        {
          execution: staticExecution(),
          to: hardcoded(identity),
          selector: hardcoded(
            hash.getSelectorFromName("get_extended_verifier_data")
          ),
          calldata: [
            reference(1, 0),
            hardcoded(shortString2.encodeShortString("nft_pp_id")),
            hardcoded("2"),
            hardcoded(contracts["verifier_pfp"]),
            hardcoded("0")
          ]
        },
        {
          execution: notEqual(6, 0, 0),
          to: reference(6, 0),
          selector: hardcoded(hash.getSelectorFromName("tokenURI")),
          calldata: [reference(7, 1), reference(7, 2)]
        }
      ]
    ]);
    if (Array.isArray(data)) {
      const name = data[0][0] !== BigInt(0) ? starknetId2.useDecoded(data[0].slice(1).map((val) => BigInt(val))) : void 0;
      const twitter = data[2][0] !== BigInt(0) ? data[2][0].toString() : void 0;
      const github = data[3][0] !== BigInt(0) ? data[3][0].toString() : void 0;
      const discord = data[4][0] !== BigInt(0) ? data[4][0].toString() : void 0;
      const proofOfPersonhood = data[5][0] === BigInt(1);
      const profile = data.length === 9 ? data[8].slice(1).map((val) => shortString2.decodeShortString(val.toString())).join("") : void 0;
      const profilePicture = profile ? profile.includes("base64") ? parseBase64Image(profile) : await fetchImageUrl(profile) : useDefaultPfp ? `https://starknet.id/api/identicons/${data[1][0].toString()}` : void 0;
      const res = {
        name,
        twitter,
        github,
        discord,
        proofOfPersonhood,
        profilePicture,
        profile
      };
      return res;
    }
    throw new Error("Error while fetching data");
  };
}
var hardcoded = (arg) => {
  return new CairoCustomEnum({
    Hardcoded: arg
  });
};
var reference = (call, pos) => {
  return new CairoCustomEnum({
    Reference: cairo.tuple(call, pos)
  });
};
var arrayReference = (call, pos) => {
  return new CairoCustomEnum({
    ArrayReference: cairo.tuple(call, pos)
  });
};
var staticExecution = () => {
  return new CairoCustomEnum({
    Static: {}
  });
};
var notEqual = (call, pos, value) => {
  return new CairoCustomEnum({
    IfNotEqual: cairo.tuple(call, pos, value)
  });
};
var parseBase64Image = (metadata) => {
  return JSON.parse(atob(metadata.split(",")[1].slice(0, -1))).image;
};
var parseImageUrl = (url) => {
  return url.startsWith("ipfs://") ? url.replace("ipfs://", "https://ipfs.io/ipfs/") : url;
};
var fetchImageUrl = async (url) => {
  try {
    const response = await fetch(parseImageUrl(url));
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    if (data.image) {
      return parseImageUrl(data.image);
    }
    return void 0;
  } catch (error) {
    console.error("There was a problem fetching the image URL:", error);
    return void 0;
  }
};
var StarknetIdcontracts = {
  sepolia: {
    naming: "0x154bc2e1af9260b9e66af0e9c46fc757ff893b3ff6a85718a810baf1474",
    identity: "0x3697660a0981d734780731949ecb2b4a38d6a58fc41629ed611e8defda",
    verifier: "0x60B94fEDe525f815AE5E8377A463e121C787cCCf3a36358Aa9B18c12c4D566",
    verifier_pop: "0x15ae88ae054caa74090b89025c1595683f12edf7a4ed2ad0274de3e1d4a",
    verifier_pfp: "0x9e7bdb8dabd02ea8cfc23b1d1c5278e46490f193f87516ed5ff2dfec02",
    multicall: "0x07a9013697371ce40d0306b4c810c6a4db9bfda119dd9ae1e8701c8e288d734b"
  },
  mainnet: {
    naming: "0x6ac597f8116f886fa1c97a23fa4e08299975ecaf6b598873ca6792b9bbfb678",
    identity: "0x05dbdedc203e92749e2e746e2d40a768d966bd243df04a6b712e222bc040a9af",
    verifier: "0x07d14dfd8ee95b41fce179170d88ba1f0d5a512e13aeb232f19cfeec0a88f8bf",
    verifier_pop: "0x0293eb2ba9862f762bd3036586d5755a782bd22e6f5028320f1d0405fd47bff4",
    verifier_pfp: "0x070aaa20ec4a46da57c932d9fd89ca5e6bb9ca3188d3df361a32306aff7d59c7",
    multicall: "0x034ffb8f4452df7a613a0210824d6414dbadcddce6c6e19bf4ddc9e22ce5f970"
  }
};
var multicallABI = [
  {
    name: "ComposableMulticallImpl",
    type: "impl",
    interface_name: "composable_multicall::IComposableMulticall"
  },
  {
    name: "composable_multicall::Execution",
    type: "enum",
    variants: [
      {
        name: "Static",
        type: "()"
      },
      {
        name: "IfEqual",
        type: "(core::integer::u32, core::integer::u32, core::felt252)"
      },
      {
        name: "IfNotEqual",
        type: "(core::integer::u32, core::integer::u32, core::felt252)"
      }
    ]
  },
  {
    name: "composable_multicall::DynamicFelt",
    type: "enum",
    variants: [
      {
        name: "Hardcoded",
        type: "core::felt252"
      },
      {
        name: "Reference",
        type: "(core::integer::u32, core::integer::u32)"
      }
    ]
  },
  {
    name: "composable_multicall::DynamicCalldata",
    type: "enum",
    variants: [
      {
        name: "Hardcoded",
        type: "core::felt252"
      },
      {
        name: "Reference",
        type: "(core::integer::u32, core::integer::u32)"
      },
      {
        name: "ArrayReference",
        type: "(core::integer::u32, core::integer::u32)"
      }
    ]
  },
  {
    name: "composable_multicall::DynamicCall",
    type: "struct",
    members: [
      {
        name: "execution",
        type: "composable_multicall::Execution"
      },
      {
        name: "to",
        type: "composable_multicall::DynamicFelt"
      },
      {
        name: "selector",
        type: "composable_multicall::DynamicFelt"
      },
      {
        name: "calldata",
        type: "core::array::Array::<composable_multicall::DynamicCalldata>"
      }
    ]
  },
  {
    name: "core::array::Span::<core::felt252>",
    type: "struct",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    name: "composable_multicall::IComposableMulticall",
    type: "interface",
    items: [
      {
        name: "aggregate",
        type: "function",
        inputs: [
          {
            name: "calls",
            type: "core::array::Array::<composable_multicall::DynamicCall>"
          }
        ],
        outputs: [
          {
            type: "core::array::Array::<core::array::Span::<core::felt252>>"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    kind: "enum",
    name: "composable_multicall::contract::ComposableMulticall::Event",
    type: "event",
    variants: []
  }
];

// src/hooks/use-switch-chain.ts
function useSwitchChain(props) {
  const { params, ...rest } = props;
  const { request, requestAsync, ...result } = useWalletRequest({
    type: "wallet_switchStarknetChain",
    params,
    ...rest
  });
  const switchChain = (args) => {
    return request(
      args ? {
        params: args,
        type: "wallet_switchStarknetChain"
      } : void 0
    );
  };
  const switchChainAsync = (args) => {
    return requestAsync(
      args ? {
        params: args,
        type: "wallet_switchStarknetChain"
      } : void 0
    );
  };
  return {
    switchChain,
    switchChainAsync,
    ...result
  };
}

// src/hooks/use-transaction-receipt.ts
import { useMemo as useMemo9 } from "react";
function useTransactionReceipt({
  hash: hash3,
  watch,
  enabled: enabled_ = true,
  ...props
}) {
  const { provider, chain } = useStarknet();
  const queryKey_ = useMemo9(() => queryKey10({ chain, hash: hash3 }), [chain, hash3]);
  const enabled = useMemo9(() => Boolean(enabled_ && hash3), [enabled_, hash3]);
  useInvalidateOnBlock({
    enabled: Boolean(enabled && watch),
    queryKey: queryKey_
  });
  return useQuery({
    queryKey: queryKey_,
    queryFn: queryFn10({ provider, hash: hash3 }),
    enabled,
    ...props
  });
}
function queryKey10({ chain, hash: hash3 }) {
  return [
    { entity: "transactionReceipt", chainId: chain?.name, hash: hash3 }
  ];
}
function queryFn10({
  provider,
  hash: hash3
}) {
  return async () => {
    if (!hash3) throw new Error("hash is required");
    return await provider.getTransactionReceipt(hash3);
  };
}

// src/hooks/use-watch-asset.ts
function useWatchAsset(props) {
  const { params, ...rest } = props;
  const { request, requestAsync, ...result } = useWalletRequest({
    type: "wallet_watchAsset",
    params,
    ...rest
  });
  const watchAsset = (args) => {
    return request(
      args ? {
        params: args,
        type: "wallet_watchAsset"
      } : void 0
    );
  };
  const watchAssetAsync = (args) => {
    return requestAsync(
      args ? {
        params: args,
        type: "wallet_watchAsset"
      } : void 0
    );
  };
  return {
    watchAsset,
    watchAssetAsync,
    ...result
  };
}

// src/hooks/use-universal-deployer-contract.tsx
function useUniversalDeployerContract(props) {
  const { address, provider } = props || {};
  return {
    udc: useContract({
      abi,
      address: address ?? "0x04a64cd09a853868621d94cae9952b106f2c36a3f81260f85de6696c6b050221",
      provider
    }).contract
  };
}
var abi = [
  {
    name: "UniversalDeployerImpl",
    type: "impl",
    interface_name: "openzeppelin::utils::universal_deployer::interface::IUniversalDeployer"
  },
  {
    name: "core::bool",
    type: "enum",
    variants: [
      {
        name: "False",
        type: "()"
      },
      {
        name: "True",
        type: "()"
      }
    ]
  },
  {
    name: "core::array::Span::<core::felt252>",
    type: "struct",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    name: "openzeppelin::utils::universal_deployer::interface::IUniversalDeployer",
    type: "interface",
    items: [
      {
        name: "deploy_contract",
        type: "function",
        inputs: [
          {
            name: "class_hash",
            type: "core::starknet::class_hash::ClassHash"
          },
          {
            name: "salt",
            type: "core::felt252"
          },
          {
            name: "from_zero",
            type: "core::bool"
          },
          {
            name: "calldata",
            type: "core::array::Span::<core::felt252>"
          }
        ],
        outputs: [
          {
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    kind: "struct",
    name: "openzeppelin::presets::universal_deployer::UniversalDeployer::ContractDeployed",
    type: "event",
    members: [
      {
        kind: "data",
        name: "address",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "deployer",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "from_zero",
        type: "core::bool"
      },
      {
        kind: "data",
        name: "class_hash",
        type: "core::starknet::class_hash::ClassHash"
      },
      {
        kind: "data",
        name: "calldata",
        type: "core::array::Span::<core::felt252>"
      },
      {
        kind: "data",
        name: "salt",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "enum",
    name: "openzeppelin::presets::universal_deployer::UniversalDeployer::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "ContractDeployed",
        type: "openzeppelin::presets::universal_deployer::UniversalDeployer::ContractDeployed"
      }
    ]
  }
];

// src/hooks/use-events.ts
import {
  BlockTag as BlockTag6,
  hash as hash2,
  num as num2
} from "starknet";
var DEFAULT_PAGE_SIZE = 5;
function useEvents({
  address,
  eventName,
  fromBlock: fromBlock_,
  toBlock: toBlock_,
  pageSize
}) {
  const { provider } = useProvider();
  const rpcProvider = provider;
  const keyFilter = eventName ? [num2.toHex(hash2.starknetKeccak(eventName))] : [];
  const keys = [keyFilter];
  const fromBlock = fromBlock_ ? blockIdentifierToBlockId(fromBlock_) : void 0;
  const toBlock = toBlock_ ? blockIdentifierToBlockId(toBlock_) : void 0;
  const chunkSize = pageSize ? pageSize : DEFAULT_PAGE_SIZE;
  const fetchEvents = async ({
    pageParam
  }) => {
    const res = await rpcProvider.getEvents({
      from_block: fromBlock,
      to_block: toBlock,
      address,
      keys,
      chunk_size: chunkSize,
      continuation_token: pageParam === "0" ? void 0 : pageParam
    });
    return res;
  };
  return useInfiniteQuery({
    // TODO: useMemo ?
    queryKey: queryKey11({
      address,
      eventName,
      fromBlock: fromBlock_,
      toBlock: toBlock_,
      pageSize
    }),
    queryFn: fetchEvents,
    initialPageParam: "0",
    getNextPageParam: (lastPage, pages) => lastPage.continuation_token
  });
}
function queryKey11({
  address,
  eventName,
  fromBlock,
  toBlock,
  pageSize
}) {
  return [
    {
      entity: "events",
      address,
      eventName,
      fromBlock,
      toBlock,
      pageSize
    }
  ];
}
function blockIdentifierToBlockId(blockIdentifier) {
  if (blockIdentifier === null) {
    return BlockTag6.PENDING;
  }
  if (typeof blockIdentifier === "number") {
    return { block_number: blockIdentifier };
  }
  if (typeof blockIdentifier === "string") {
    if (blockIdentifier === "latest" || blockIdentifier === "pending") {
      return blockIdentifier;
    }
    return { block_hash: blockIdentifier };
  }
  throw new Error(
    `Unsupported BlockIdentifier type: ${typeof blockIdentifier}`
  );
}

// src/hooks/use-paymaster-estimate-fees.ts
import { useMemo as useMemo10 } from "react";
function usePaymasterEstimateFees({
  calls,
  options,
  watch = false,
  enabled: enabled_ = true,
  ...props
}) {
  const { account } = useAccount();
  const queryKey_ = useMemo10(
    () => queryKey12({ calls, options }),
    [calls, options]
  );
  const enabled = useMemo10(() => Boolean(enabled_ && calls), [enabled_, calls]);
  useInvalidateOnBlock({
    enabled: Boolean(enabled && watch),
    queryKey: queryKey_
  });
  return useQuery({
    queryKey: queryKey_,
    queryFn: queryFn11({
      account,
      calls,
      options
    }),
    enabled,
    ...props
  });
}
function queryKey12({ calls, options }) {
  return [
    {
      entity: "estimatePaymasterTransactionFee",
      calls,
      options
    }
  ];
}
function queryFn11({
  account,
  calls,
  options
}) {
  return async () => {
    if (!account) throw new Error("account is required");
    if (!calls || calls.length === 0) throw new Error("calls are required");
    return await account.estimatePaymasterTransactionFee(calls, options);
  };
}

// src/hooks/use-paymaster-gas-tokens.ts
import { useMemo as useMemo11 } from "react";
function usePaymasterGasTokens({
  watch = false,
  enabled: enabled_ = true,
  ...props
} = {}) {
  const { paymasterProvider } = useProvider();
  const queryKey_ = useMemo11(() => queryKey13(), []);
  const enabled = useMemo11(() => Boolean(enabled_), [enabled_]);
  useInvalidateOnBlock({
    enabled: Boolean(enabled && watch),
    queryKey: queryKey_
  });
  return useQuery({
    queryKey: queryKey_,
    queryFn: queryFn12({
      paymasterProvider
    }),
    enabled,
    ...props
  });
}
function queryKey13() {
  return [
    {
      entity: "paymaster_gasTokens"
    }
  ];
}
function queryFn12({
  paymasterProvider
}) {
  return async () => {
    if (!paymasterProvider) throw new Error("PaymasterProvider is required");
    return await paymasterProvider.getSupportedTokens();
  };
}

// src/hooks/use-paymaster-send-transaction.ts
import { useCallback as useCallback5 } from "react";
function usePaymasterSendTransaction(props) {
  const { calls, options, maxFeeInGasToken, ...rest } = props;
  const { account } = useAccount();
  const { mutate, mutateAsync, ...result } = useMutation({
    mutationKey: mutationKey3(calls || []),
    mutationFn: mutationFn3({ account, options, maxFeeInGasToken }),
    ...rest
  });
  const send = useCallback5(
    (args) => {
      mutate(args || calls || []);
    },
    [mutate, calls]
  );
  const sendAsync = useCallback5(
    (args) => {
      return mutateAsync(args || calls || []);
    },
    [mutateAsync, calls]
  );
  return {
    send,
    sendAsync,
    ...result
  };
}
function mutationKey3(args) {
  return [{ entity: "paymaster_sendTransaction", calls: args }];
}
function mutationFn3({
  account,
  options,
  maxFeeInGasToken
}) {
  return async (calls) => {
    if (!account) throw new Error("account is required");
    if (!calls || calls.length === 0) throw new Error("calls are required");
    return account.executePaymasterTransaction(
      calls,
      options,
      maxFeeInGasToken
    );
  };
}
export {
  useAccount,
  useAddChain,
  useBalance,
  useBlock,
  useBlockNumber,
  useCall,
  useConnect,
  useContract,
  useContractFactory,
  useDeclareContract,
  useDeployAccount,
  useDisconnect,
  useEstimateFees,
  useEvents,
  useExplorer,
  useInvalidateOnBlock,
  useNetwork,
  useNonceForAddress,
  usePaymasterEstimateFees,
  usePaymasterGasTokens,
  usePaymasterSendTransaction,
  useProvider,
  useReadContract,
  useSendTransaction,
  useSignTypedData,
  useStarkAddress,
  useStarkName,
  useStarkProfile,
  useSwitchChain,
  useTransactionReceipt,
  useUniversalDeployerContract,
  useWalletRequest,
  useWatchAsset
};
//# sourceMappingURL=index.js.map