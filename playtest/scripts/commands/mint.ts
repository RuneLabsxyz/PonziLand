import { file } from "bun";
import { Configuration } from "../env";
import { connect, doTransaction, Token } from "../utils";
import { prompt } from "prompts";
import { BigNumber } from "bignumber.js";
import { cairo, CallData } from "starknet";

export async function mint(config: Configuration, args: string[]) {
  const { tokens } = (await file(
    `${config.basePath}/tokens.${config.environment}.json`,
  ).json()) as {
    tokens: Token[];
  };

  // Ask for the recipient
  const questions = [
    {
      type: "select",
      name: "token",
      message: "What token do you want to mint?",
      choices: tokens.map((token) => {
        return { title: token.symbol, value: token.address };
      }),
    },
    {
      type: "select",
      name: "self",
      message: "Who is the recipient?",
      choices: [
        { title: "Me", value: true },
        { title: "Someone else", value: false },
      ],
    },
    {
      type: (prev: boolean) => (!prev ? "text" : null),
      name: "recipient",
      message: "What is the recipient's address?",
    },
    {
      type: "number",
      name: "amount",
      message: "How many tokens do you want to mint?",
    },
  ];

  let result: {
    token: string;
    self: boolean;
    recipient?: string;
    amount: number;
  } = await prompt(questions);

  // Multiply the number to get the amount wanted
  BigNumber.config({ EXPONENTIAL_AT: [-40, 40] });

  const amount = new BigNumber(result.amount).shiftedBy(18).toFixed(0);

  // Call the mint function
  const { account } = await connect(config);

  await doTransaction({
    contractAddress: result.token,
    entrypoint: "mint",
    calldata: CallData.compile({
      recipient: BigInt(result.self ? account.address : result.recipient!),
      amount: cairo.uint256(amount),
    }),
  });
}
