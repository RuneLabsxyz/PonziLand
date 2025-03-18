import {
  CairoCustomEnum,
  CairoOption,
  CairoOptionVariant,
  CallData,
} from "starknet";
import { COLORS, doTransaction, getContractAddress } from "./scripts/utils";

if (process.argv.length < 3) {
  console.error("Usage: bun run ./reset.js <address>");
  process.exit(1);
}

const addressToReset = process.argv[2];
console.log(`${COLORS.blue}ℹ️ Resetting ${addressToReset}...${COLORS.reset}`);
await doTransaction([
  {
    contractAddress: getContractAddress("auth"),
    entrypoint: "remove_authorized",
    calldata: CallData.compile({
      address: addressToReset,
    }),
  },
  // Reset the mint status
  {
    contractAddress:
      "0x02d9ec36cd62c36e2b3cb2256cd07af0e5518e9e462a8091d73b0ba045fc1446",
    entrypoint: "set_mint_status",
    calldata: CallData.compile({
      address: addressToReset,
      status: new CairoOption<CairoCustomEnum>(CairoOptionVariant.None),
    }),
  },
]);
