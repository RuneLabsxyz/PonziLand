import { createDojoConfig, DojoProvider } from '@dojoengine/core';
import { loadManifest } from '$lib/manifest';
import {
  PUBLIC_DOJO_RPC_URL,
  PUBLIC_DOJO_TORII_URL,
  PUBLIC_DOJO_PROFILE,
  PUBLIC_DOJO_BURNER_ADDRESS,
  PUBLIC_DOJO_BURNER_PRIVATE,
  PUBLIC_DOJO_CHAIN_ID,
} from '$env/static/public';

import type {
  CallPolicy,
  ContractPolicy,
  SessionPolicies,
} from '@cartridge/presets';

import type { DojoConfig as DojoConfigInternal } from '@dojoengine/core';

export type DojoConfig = DojoConfigInternal & {
  policies: SessionPolicies;
  profile: string;
  chainId: string;
};

let dojoConfigCache: DojoConfig | null = null;

/**
 * Creates session policies from the manifest
 */
function createPolicies(manifest: any): SessionPolicies {
  const contracts: Record<string, ContractPolicy> = Object.fromEntries(
    manifest.contracts.map((e: any) => {
      return [
        e.address,
        {
          name: e.tag,
          methods: e.systems.map((system: any) => {
            return {
              entrypoint: system,
            };
          }),
        },
      ];
    }),
  );

  return {
    contracts,
  };
}

/**
 * Loads the dojo configuration asynchronously.
 * This function loads the manifest and creates the dojo config with policies.
 */
export async function loadDojoConfig(): Promise<DojoConfig> {
  // Return cached config if available
  if (dojoConfigCache !== null) {
    return dojoConfigCache;
  }

  // Load the manifest
  const manifest = await loadManifest();

  // Create policies from manifest
  const policies = createPolicies(manifest);

  // Create internal dojo config
  const internalDojoConfig = createDojoConfig({
    manifest,
    rpcUrl: PUBLIC_DOJO_RPC_URL,
    toriiUrl: PUBLIC_DOJO_TORII_URL,
    masterAddress: PUBLIC_DOJO_BURNER_ADDRESS,
    masterPrivateKey: PUBLIC_DOJO_BURNER_PRIVATE,
  });

  // Create the full config
  dojoConfigCache = {
    ...internalDojoConfig,
    policies,
    profile: PUBLIC_DOJO_PROFILE,
    chainId: PUBLIC_DOJO_CHAIN_ID,
  };

  return dojoConfigCache;
}

/**
 * Gets the cached dojo config synchronously.
 * This should only be used after loadDojoConfig() has been called at least once.
 * Throws an error if config hasn't been loaded yet.
 */
export function getDojoConfig(): DojoConfig {
  if (dojoConfigCache === null) {
    throw new Error('Dojo config not loaded yet. Call loadDojoConfig() first.');
  }
  return dojoConfigCache;
}

/**
 * Clears the dojo config cache. Useful for testing or when config needs to be reloaded.
 */
export function clearDojoConfigCache(): void {
  dojoConfigCache = null;
}

/**
 * @deprecated Use loadDojoConfig() instead. This export is kept for backwards compatibility
 * but will be removed in a future version.
 */
export const dojoConfig = new Proxy({} as DojoConfig, {
  get() {
    throw new Error(
      'dojoConfig is now async. Use loadDojoConfig() to get the configuration.',
    );
  },
});
