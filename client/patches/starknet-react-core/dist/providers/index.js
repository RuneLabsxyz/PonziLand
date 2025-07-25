// src/providers/jsonrpc.ts
import { RpcProvider } from "starknet";

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

// src/context/account.tsx
import React, { useContext } from "react";
import { jsx } from "react/jsx-runtime";
var AccountContext = React.createContext({
  account: void 0,
  address: void 0
});

// src/context/starknet.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var defaultQueryClient = new QueryClient();
var StarknetContext = createContext(void 0);
function starknetChainId(chainId) {
  switch (chainId) {
    case mainnet.id:
      return constants.StarknetChainId.SN_MAIN;
    case sepolia.id:
      return constants.StarknetChainId.SN_SEPOLIA;
    default:
      return void 0;
  }
}

// src/context/index.tsx
import { jsx as jsx3 } from "react/jsx-runtime";

// src/providers/jsonrpc.ts
function jsonRpcProvider({
  rpc
}) {
  return (chain) => {
    const config = rpc(chain);
    if (!config) return null;
    const chainId = starknetChainId(chain.id);
    const provider = new RpcProvider({ ...config, chainId });
    return provider;
  };
}

// src/providers/public.ts
function publicProvider() {
  return jsonRpcProvider({
    rpc: (chain) => {
      const rpcs = chain.rpcUrls.public.http;
      const nodeUrl = rpcs[Math.floor(Math.random() * rpcs.length)];
      if (!nodeUrl) return null;
      return { nodeUrl, specVersion: "0.8.1" };
    }
  });
}

// src/providers/alchemy.ts
function alchemyProvider({ apiKey }) {
  return jsonRpcProvider({
    rpc: (chain) => {
      const baseHttpUrl = chain.rpcUrls["alchemy"]?.http[0];
      if (!baseHttpUrl) return null;
      const nodeUrl = `${baseHttpUrl}/${apiKey}`;
      return { nodeUrl };
    }
  });
}

// src/providers/blast.ts
function blastProvider({ apiKey }) {
  return jsonRpcProvider({
    rpc: (chain) => {
      const baseHttpUrl = chain.rpcUrls["blast"]?.http[0];
      if (!baseHttpUrl) return null;
      const nodeUrl = `${baseHttpUrl}/${apiKey}`;
      return { nodeUrl };
    }
  });
}

// src/providers/cartridge.ts
function cartridgeProvider() {
  return jsonRpcProvider({
    rpc: (chain) => {
      const nodeUrl = chain.rpcUrls["cartridge"]?.http[0];
      if (!nodeUrl) return null;
      return { nodeUrl };
    }
  });
}

// src/providers/infura.ts
function infuraProvider({ apiKey }) {
  return jsonRpcProvider({
    rpc: (chain) => {
      const baseHttpUrl = chain.rpcUrls["infura"]?.http[0];
      if (!baseHttpUrl) return null;
      const nodeUrl = `${baseHttpUrl}/${apiKey}`;
      return { nodeUrl };
    }
  });
}

// src/providers/lava.ts
function lavaProvider({ apiKey }) {
  return jsonRpcProvider({
    rpc: (chain) => {
      const baseHttpUrl = chain.rpcUrls["lava"]?.http[0];
      if (!baseHttpUrl) return null;
      const nodeUrl = `${baseHttpUrl}/${apiKey}`;
      return { nodeUrl };
    }
  });
}

// src/providers/reddio.ts
function reddioProvider({ apiKey }) {
  return jsonRpcProvider({
    rpc: (chain) => {
      const baseHttpUrl = chain.rpcUrls["reddio"]?.http[0];
      if (!baseHttpUrl) return null;
      const nodeUrl = `${baseHttpUrl}/${apiKey}`;
      return { nodeUrl };
    }
  });
}

// src/providers/slot.ts
import { getSlotChain } from "@starknet-react/chains";
function slotProvider({ projectId }) {
  return jsonRpcProvider({
    rpc: () => {
      const chain = getSlotChain(projectId);
      const nodeUrl = chain.rpcUrls.public.http[0];
      return { nodeUrl };
    }
  });
}
export {
  alchemyProvider,
  blastProvider,
  cartridgeProvider,
  infuraProvider,
  jsonRpcProvider,
  lavaProvider,
  publicProvider,
  reddioProvider,
  slotProvider
};
//# sourceMappingURL=index.js.map