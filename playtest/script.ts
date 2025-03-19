function getCalls(contractAddress: string) {
  const calls: Call[] = [];
  for (const holder of holders) {
    calls.push({
      contractAddress,
      entrypoint: "set_mint_status",
      // approve 1 wei for bridge
      calldata: CallData.compile({
        address: holder.account_address,
        status: new CairoOption<CairoCustomEnum>(
          CairoOptionVariant.Some,
          new CairoCustomEnum({ ePAL: {} }),
        ),
      }),
    });
  }
  return calls;
}

async function resetUser(address: string) {
  console.log("Reseting user.");
  const authContractAddress = manifest.contracts.find(
    (e) => e.tag == "ponzi_land-auth",
  )?.address;

  const txHash = await account.execute([
    // Reset the activation status
  ]);

  console.log(txHash);

  await provider.waitForTransaction(txHash.transaction_hash);

  console.log(`Transaction ${txHash} passed!`);
}

await resetUser(
  "0x01537422a78edbb830b46007573169e2d0c1b524f6de8f9e7775f3be1be5da5d",
);

exit(0);

async function setAccess(token_address: string) {
  const contract = new Contract(ABI, token_address, account).typedv2(ABI);

  const tx = await contract;

  await provider.waitForTransaction(tx.transaction_hash);

  console.log(`Transaction ${tx.transaction_hash} passed!`);
}

for (const token of tokens.tokens) {
  console.log("Adding ourselves as a validator");

  await setAccess(token.address);
}
