import {
  CairoCustomEnum,
  CairoOption,
  CairoOptionVariant,
  CallData,
} from "starknet";
import {
  doTransaction,
  forEachToken,
  getContractAddress,
  setAccess,
} from "./scripts/utils";

const SOCIALINK_SIGNER_ADDRESS =
  "0x008ea9029cec9c339e0513a17336e9af43278ebd81858aee0af110c3e810fce6";
const SOCIALINK_GRANTER_ADDRESS =
  "0x02d9ec36cd62c36e2b3cb2256cd07af0e5518e9e462a8091d73b0ba045fc1446";

await doTransaction({
  contractAddress:
    "0x02d9ec36cd62c36e2b3cb2256cd07af0e5518e9e462a8091d73b0ba045fc1446",
  entrypoint: "set_mint_status",
  calldata: CallData.compile({
    address: "0x1",
    status: new CairoOption<CairoCustomEnum>(
      CairoOptionVariant.Some,
      new CairoCustomEnum({
        ePAL: {},
      }),
    ),
  }),
});
