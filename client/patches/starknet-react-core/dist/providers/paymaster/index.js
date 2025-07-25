// src/providers/paymaster/paymasterrpc.ts
import { PaymasterRpc } from "starknet";
function paymasterRpcProvider({
  rpc
}) {
  return (chain) => {
    const config = rpc(chain);
    if (!config) return null;
    const provider = new PaymasterRpc(config);
    return provider;
  };
}

// src/providers/paymaster/avnu.ts
function avnuPaymasterProvider({
  apiKey
}) {
  return paymasterRpcProvider({
    rpc: (chain) => {
      const baseHttpUrl = chain.paymasterRpcUrls.avnu.http[0];
      if (!baseHttpUrl) return null;
      return { nodeUrl: baseHttpUrl, headers: { "x-api-key": apiKey ?? "" } };
    }
  });
}
export {
  avnuPaymasterProvider,
  paymasterRpcProvider
};
//# sourceMappingURL=index.js.map