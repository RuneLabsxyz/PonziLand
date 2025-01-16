import { dojoConfig } from "$lib/dojoConfig";
import {
  type SignSessionError,
  type CreateSessionParams,
  createSession,
  buildSessionAccount,
  bytesToHexString,
  type SessionKey,
  createSessionRequest,
} from "@argent/x-sessions";
import { ec, constants, WalletAccount, RpcProvider, Account } from "starknet";
import { WALLET_API } from "@starknet-io/types-js";
import { CommonStarknetWallet } from "./getStarknet";
import type { AccountProvider, StoredSession } from "$lib/contexts/account";

const STRKFees = [
  {
    tokenAddress:
      "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    maxAmount: "10000000000000000",
  },
  {
    tokenAddress:
      "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    maxAmount: "200000000000000000000",
  },
];

async function setupSession(
  wallet: WalletAccount,
  walletObject: WALLET_API.StarknetWindowObject
): Promise<[Account, StoredSession]> {
  const privateKey = ec.starkCurve.utils.randomPrivateKey();
  const chainId =
    dojoConfig.profile == "mainnet"
      ? constants.StarknetChainId.SN_MAIN
      : constants.StarknetChainId.SN_SEPOLIA;

  const address = wallet.address;

  const sessionKey: SessionKey = {
    privateKey: bytesToHexString(privateKey),
    publicKey: ec.starkCurve.getStarkKey(privateKey),
  };

  const expiry = Math.floor((Date.now() + 1000 * 60 * 60 * 24) / 1000) as any; // ie: 1 day

  const sessionParams: CreateSessionParams = {
    sessionKey,
    allowedMethods: dojoConfig.policies.map((policy) => ({
      "Contract Address": policy.target,
      selector: policy.method,
    })),
    expiry,
    metaData: {
      projectID: "ponzi-land",
      txFees: STRKFees,
    },
  };

  // create the session request to get the typed data to be signed
  const sessionRequest = createSessionRequest({
    sessionParams,
    chainId,
  });

  // wallet is a StarknetWindowObject
  const authorisationSignature = await walletObject.request({
    type: "wallet_signTypedData",
    params: sessionRequest.sessionTypedData,
  });

  // open session and sign message
  const session = await createSession({
    sessionRequest, // SessionRequest
    address, // Account address
    chainId, // StarknetChainId
    authorisationSignature, // Signature
  });

  const sessionAccount = await buildSessionAccount({
    useCacheAuthorisation: false, // optional and defaulted to false, will be added in future developments
    session,
    sessionKey,
    provider: new RpcProvider({
      nodeUrl: dojoConfig.rpcUrl,
      chainId: constants.StarknetChainId.SN_SEPOLIA,
    }),
  });

  console.log("Successfully got account!", sessionAccount.address);

  return [
    sessionAccount,
    {
      expiry,
      address,
      privateKey: sessionKey.privateKey,
    },
  ];
}

export class ArgentXAccount extends CommonStarknetWallet {
  supportsSession(): boolean {
    return true;
  }

  getAccount(): Account | undefined {
    return this._session;
  }

  async setupSession(): Promise<StoredSession> {
    const [account, storedSession] = await setupSession(
      this._wallet!,
      this._walletObject
    );

    this._session = account;

    return storedSession;
  }
}
