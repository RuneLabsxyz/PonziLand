import { createDojoConfig, DojoProvider } from '@dojoengine/core';
import manifest from '$manifest';
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

const policies: SessionPolicies = (() => {
  const contracts: Record<string, ContractPolicy> = Object.fromEntries(
    manifest.contracts.map((e) => {
      return [
        e.address,
        {
          name: e.tag,
          methods: e.systems.map((system) => {
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
})();

const internalDojoConfig = createDojoConfig({
  manifest,
  rpcUrl: PUBLIC_DOJO_RPC_URL,
  toriiUrl: PUBLIC_DOJO_TORII_URL,
  masterAddress: PUBLIC_DOJO_BURNER_ADDRESS,
  masterPrivateKey: PUBLIC_DOJO_BURNER_PRIVATE,
});

export type DojoConfig = DojoConfigInternal & {
  policies: SessionPolicies;
  profile: string;
  chainId: string;
};

export const dojoConfig: DojoConfig = {
  ...internalDojoConfig,
  policies,
  profile: PUBLIC_DOJO_PROFILE,
  chainId: PUBLIC_DOJO_CHAIN_ID,
};
