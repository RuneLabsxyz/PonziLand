import { WarpCore, MultiProtocolProvider, type ChainMetadata, type ChainMap } from '@hyperlane-xyz/sdk';
import { GithubRegistry } from '@hyperlane-xyz/registry';
import type { Address } from '@hyperlane-xyz/utils';

export async function initializeHyperlane() {
  const registry = new GithubRegistry({
    uri: 'https://github.com/hyperlane-xyz/hyperlane-registry',
    branch: 'main'
  });

  const chainMetadata = await registry.getMetadata();
  const chainAddresses = await registry.getAddresses();

  console.log('🔍 Chain metadata from registry:', chainMetadata);
  console.log('🔍 Chain addresses from registry:', chainAddresses);

  // Enrich chain metadata with mailbox addresses from chainAddresses
  // SVM chains (Solana) require mailbox addresses for the token adapters
  // Also override RPC URLs if custom ones are provided via env variables
  const enrichedMetadata: ChainMap<ChainMetadata & { mailbox?: Address }> = Object.fromEntries(
    Object.entries(chainMetadata).map(([chainName, metadata]) => {
      const addresses = chainAddresses[chainName];
      const enriched: ChainMetadata & { mailbox?: Address } = { ...metadata };

      // Add mailbox if available
      if (addresses?.mailbox) {
        enriched.mailbox = addresses.mailbox;
      }

      // Override RPC URLs
      // 1. From environment variables (for custom RPCs with API keys)
      // 2. Or use local proxy to avoid CORS issues with public RPCs
      const envKey = `VITE_${chainName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_RPC_URL`;
      const customRpc = import.meta.env[envKey];

      if (customRpc) {
        console.log(`🔧 Using custom RPC for ${chainName}: ${customRpc}`);
        enriched.rpcUrls = [{ http: customRpc }];
      } else if (chainName === 'solanamainnet' && typeof window !== 'undefined') {
        // Use local proxy to avoid CORS issues with Solana public RPC
        const proxyUrl = `${window.location.origin}/api/rpc/solanamainnet`;
        console.log(`🔧 Using local proxy for ${chainName}: ${proxyUrl}`);
        enriched.rpcUrls = [{ http: proxyUrl }];
      }

      return [chainName, enriched];
    })
  );

  console.log('🔍 Enriched metadata (with mailboxes):',
    Object.entries(enrichedMetadata)
      .filter(([name]) => name.toLowerCase().includes('solana') || name.toLowerCase().includes('starknet'))
      .map(([name, meta]) => ({
        name,
        hasMailbox: !!meta.mailbox,
        mailbox: meta.mailbox
      }))
  );

  const multiProvider = new MultiProtocolProvider(enrichedMetadata);
  const warpRoutes = await registry.getWarpRoutes();

  // Define chains we want to support
  const SUPPORTED_CHAINS = ['starknet', 'solana', 'solanamainnet'];

  // Filter complete routes (not individual tokens)
  // A route is valid only if ALL its tokens are on supported chains
  const filteredRoutes = Object.entries(warpRoutes).filter(([_routeId, route]) => {
    const allTokensSupported = route.tokens.every(token => {
      const chainName = token.chainName.toLowerCase();
      return SUPPORTED_CHAINS.some(supported => chainName.includes(supported));
    });
    return allTokensSupported;
  });

  console.log('🔍 All routes:', Object.keys(warpRoutes).length);
  console.log('🔍 Filtered routes (only Solana + Starknet):', filteredRoutes.length);

  // Get tokens from filtered routes
  const filteredTokens = filteredRoutes.flatMap(([_, route]) => route.tokens);

  console.log('🔍 Tokens in filtered routes:', filteredTokens.length);
  console.log('🔍 Tokens by chain:',
    filteredTokens.reduce((acc, t) => {
      acc[t.chainName] = (acc[t.chainName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );
  console.log('🔍 Available token symbols:', Array.from(new Set(filteredTokens.map(t => t.symbol))));

  // Build config with filtered tokens
  const warpConfig = {
    tokens: filteredTokens,
    options: Object.fromEntries(filteredRoutes.map(([id, route]) => [id, route.options]))
  };

  console.log('Warp config:', warpConfig);

  const warpCore = WarpCore.FromConfig(multiProvider, warpConfig);

  return { warpCore, multiProvider, registry, chainAddresses };
}