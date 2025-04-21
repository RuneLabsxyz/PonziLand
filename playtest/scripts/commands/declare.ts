import { Configuration } from "../env";
import { connect } from "../utils";

export async function declare(config: Configuration, args: string[]) {
  const { account } = await connect(config);

  // Declare the wanted contract
}
