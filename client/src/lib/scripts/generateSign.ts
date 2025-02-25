import { ec, encode,shortString } from "starknet";

async function main() {
  const privateKey = "0x1234567890987654321";

  // Get x-coordinate only (since Cairo accepts it)
  const publicKeyX = "0x" + encode.buf2hex(ec.starkCurve.getPublicKey(privateKey, true).slice(1));
  console.log("Public Key (x-coordinate, hex):", publicKeyX);

  // List of addresses to sign
  const addresses = [
    { name: "RECIPIENT", value: shortString.encodeShortString("RECIPIENT") },
    { name: "FIRST_OWNER", value: shortString.encodeShortString("FIRST_OWNER") },
    { name: "NEIGHBOR_1", value: shortString.encodeShortString("NEIGHBOR_1") },
    { name: "NEIGHBOR_2", value: shortString.encodeShortString("NEIGHBOR_2") },
    { name: "NEIGHBOR_3", value: shortString.encodeShortString("NEIGHBOR_3") },
    { name: "NEW_BUYER", value: shortString.encodeShortString("NEW_BUYER") },
  ];

  // Sign each address
  for (const addr of addresses) {
    const message = addr.value;
    const signature = ec.starkCurve.sign(message, privateKey);
    console.log(`\nAddress: ${addr.name} (${addr.value})`);
    console.log("Signature r:", "0x" + signature.r.toString(16));
    console.log("Signature s:", "0x" + signature.s.toString(16));
    // Optional: Verify (though we know X-coordinate fails in JS)
    const isValidX = ec.starkCurve.verify(signature, message, publicKeyX);
    console.log("Valid with x-coordinate in JS? (expect false):", isValidX);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});