const PUBLIC_RPC_URL = "https://api.cartridge.gg/x/starknet/mainnet"
const PUBLIC_CHAIN_ID = "mainnet"


export type AccountConfig = {
    rpcUrl: string;
    chainId: string;
};

export const accountConfig: AccountConfig = {
    rpcUrl: PUBLIC_RPC_URL,
    chainId: PUBLIC_CHAIN_ID,
};



