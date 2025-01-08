import { createDojoConfig } from "@dojoengine/core";

import manifest from "../../../contracts/manifest_sepolia.json";

export const dojoConfig = createDojoConfig({
  manifest,
  rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia",
  toriiUrl: "https://api.cartridge.gg/x/ponziland-sepolia/torii",
});
