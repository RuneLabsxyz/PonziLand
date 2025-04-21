import { cairo, Calldata, CallData } from "starknet";
import { Configuration } from "../env";
import { connect, doTransaction, TokenCreation } from "../utils";
import { file } from "bun";

export async function testTransaction(config: Configuration) {
  const { account } = await connect(config);
  let contractClass = await file(
    `${config.basePath}/target/dev/testerc20_testerc20_PlayTestToken.contract_class.json`,
  ).json();

  let casm = await file(
    `${config.basePath}/target/dev/testerc20_testerc20_PlayTestToken.compiled_contract_class.json`,
  ).json();

  const contractCallData: CallData = new CallData(contractClass.abi);
  const contractConstructor: Calldata = contractCallData.compile(
    "constructor",
    {
      owner: account.address,
      name: "Equivalent STRK",
      symbol: "eSTRK",
    },
  );

  // Deploy using starknet
  console.log(
    await account.deploy({
      classHash:
        "0x1c496de15d97bca8c565a41e320970980ad9e365a6eceea2b48e2d8ff429eb1",
      constructorCalldata: contractConstructor,
    }),
  );
}
