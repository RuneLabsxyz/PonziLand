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

// Add a signer
console.log("=== Ensuring signer is setup...");
await doTransaction({
  contractAddress: getContractAddress("auth"),
  entrypoint: "add_verifier",
  calldata: [SOCIALINK_SIGNER_ADDRESS],
});

console.log("=== Ensuring that tokens are mintable");
await forEachToken(async (token) => {
  return setAccess(token.address, SOCIALINK_GRANTER_ADDRESS, "Minter");
});

console.log("=== Ensuring signer can call the minter");
await doTransaction(
  await setAccess(
    SOCIALINK_GRANTER_ADDRESS,
    SOCIALINK_SIGNER_ADDRESS,
    "Minter",
  ),
);
