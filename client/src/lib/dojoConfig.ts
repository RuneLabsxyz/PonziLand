import { createDojoConfig, DojoProvider } from "@dojoengine/core";
import manifest from "$manifest";
import {
  PUBLIC_DOJO_RPC_URL,
  PUBLIC_DOJO_TORII_URL,
  PUBLIC_DOJO_PROFILE,
  PUBLIC_DOJO_BURNER_ADDRESS,
  PUBLIC_DOJO_BURNER_PRIVATE,
} from "$env/static/public";
import type { CallPolicy } from "@cartridge/controller";
import type { DojoConfig as DojoConfigInternal } from "@dojoengine/core";

const policies: CallPolicy[] = manifest.contracts.flatMap((contract) => {
  return contract.systems.map((system) => ({
    target: contract.address,
    method: system,
  }));
});

const internalDojoConfig = createDojoConfig({
  manifest,
  rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia",
  toriiUrl: "https://api.cartridge.gg/x/ponziland-sepolia/torii",
  masterAddress: PUBLIC_DOJO_BURNER_ADDRESS,
  masterPrivateKey: PUBLIC_DOJO_BURNER_PRIVATE,
});

export type DojoConfig = DojoConfigInternal & {
  policies: CallPolicy[];
  profile: string;
};

export const dojoConfig: DojoConfig = {
  ...internalDojoConfig,
  policies,
  profile: PUBLIC_DOJO_PROFILE,
};
