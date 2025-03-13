import { LAYERSWAP_TOKEN } from '$env/static/private';
import { PUBLIC_DOJO_CHAIN_ID } from '$env/static/public';
import Layerswap from '@layerswap/sdk';
import { Fan } from 'lucide-svelte';

export const SWAP_ENV = {
  SN_SEPOLIA: {
    destination_network: 'STARKNET_SEPOLIA',
    destination_token: 'USDC',
  },
};

export const client = new Layerswap({
  apiKey: LAYERSWAP_TOKEN, // This is the default and can be omitted
});

export async function getNetworks() {
  const env = SWAP_ENV[PUBLIC_DOJO_CHAIN_ID as keyof typeof SWAP_ENV];
  // We use the getSources instead of the main network response to get only tokens that can get us the wanted token
  const networks = await client.networks.sources.list({
    destination_network: env.destination_network,
    destination_token: env.destination_token,
    include_swaps: true,
    include_unavailable: false,
    include_unmatched: false,
  });
  return networks;
}

export async function fetchQuote(
  sourceNetwork: string,
  sourceToken: string,
  amount: number,
) {
  const env = SWAP_ENV[PUBLIC_DOJO_CHAIN_ID as keyof typeof SWAP_ENV];
  const quote = await client.swaps.quote.retrieve({
    destination_network: env.destination_network,
    destination_token: env.destination_token,
    source_network: sourceNetwork,
    source_token: sourceToken,
    amount,
    refuel: false,
  });

  return quote;
}

export async function startSwap(
  sourceNetwork: string,
  sourceToken: string,
  destinationAddress: string,
  amount: number,
) {
  const env = SWAP_ENV[PUBLIC_DOJO_CHAIN_ID as keyof typeof SWAP_ENV];
  const swap = await client.swaps.create({
    use_deposit_address: false,

    destination_network: env.destination_network,
    destination_token: env.destination_token,

    source_network: sourceNetwork,
    source_token: sourceToken,

    destination_address: destinationAddress,

    amount,
    refuel: false,
  });

  return swap;
}

export async function getSwapInfo(swapId: string) {
  const swap = await client.swaps.retrieve(swapId);

  return swap;
}

export async function getDepositActions(swapId: string) {
  const transfers = await client.swaps.depositActions.list(swapId);

  return transfers;
}
