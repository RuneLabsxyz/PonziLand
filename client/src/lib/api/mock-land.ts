// This represents the Cairo smart contract model for Land NFTs in the Realms game
// The data structure below mirrors the one in Cairo, which we'll use to fetch and display land data
import { derived, writable } from 'svelte/store';

// Cairo struct reference:
// pub struct land {
//     #[key]
//     pub location: u64, // 64 x 64 land grid - location calculated as: y * 64 + x
//     pub block_date_bought: u64,
//     pub owner: ContractAddress,
//     pub sell_price: u64,
//     pub token_used: ContractAddress, // Currency token used (LORDS, ETH, etc.)
//     pub pool_key: ContractAddress, // The Liquidity Pool Key (pool_lords, pool_eth, etc.)
// }

export const mockPlayerAddress = '0x1234567890abcdef';

// Add token address constants
const TOKEN_ADDRESSES = {
  LORDS: '0x124afc6f5a0fc34cc1af16a1cdee98ffb20c31f11acc11111',
  ETH: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  STARK: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  PAPER: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};

// Add this interface for bid structure
interface Bid {
  price: number;
  bidder: string;
  timestamp: number;
}

interface AuctionData {
  active: boolean;
  bids: Bid[];
}

// Separate auction store
export const mockAuctionData = new Map<number, AuctionData>();

// Generate auction data separately
Array.from({ length: 64 * 64 }).forEach((_, index) => {
  // Only create auction data for unoccupied lands (70% chance as per original logic)
  if (Math.random() >= 0.3) {
    const numBids = Math.floor(Math.random() * 6);
    const auctionBids: Bid[] = [];

    if (numBids > 0) {
      let currentPrice = Math.floor(Math.random() * 50000) + 10000;
      let currentTimestamp = Date.now() - Math.random() * 3600000;

      for (let i = 0; i < numBids; i++) {
        auctionBids.push({
          price: currentPrice,
          bidder: `0x${Math.random().toString(16).slice(2, 42)}`,
          timestamp: Math.floor(currentTimestamp),
        });
        currentPrice += currentPrice * (Math.random() * 0.2 + 0.1);
        currentTimestamp -= Math.random() * 3540000 + 60000;
      }
      auctionBids.sort((a, b) => a.timestamp - b.timestamp);
    }

    mockAuctionData.set(index, {
      active: numBids > 0,
      bids: auctionBids,
    });
  }
});

// Modify the mockLandData to not include auction data directly
export const mockLandData = Array.from({ length: 64 * 64 }, (_, index) => {
  const isOccupied = Math.random() < 0.3;

  if (!isOccupied) {
    return {
      location: index,
      block_date_bought: 0,
      owner: null,
      sell_price: 0,
      token_used: null,
      token_address: null,
      pool_key: null,
    };
  }

  const isMockPlayerOwner = Math.random() < 0.01;
  const tokenType = ['LORDS', 'ETH', 'STARK', 'PAPER'][
    Math.floor(Math.random() * 4)
  ] as keyof typeof TOKEN_ADDRESSES;

  return {
    location: index,
    block_date_bought:
      Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 10000000),
    owner: isMockPlayerOwner
      ? mockPlayerAddress
      : `0x${Math.random().toString(16).slice(2, 42)}`,
    sell_price: Math.floor(Math.random() * 1000000),
    token_used: tokenType,
    token_address: TOKEN_ADDRESSES[tokenType],
    pool_key: ['pool_lords', 'pool_eth', 'pool_stark', 'pool_paper'][
      Math.floor(Math.random() * 4)
    ],
  };
});

export const landStore = writable(mockLandData);
export const auctionStore = writable(mockAuctionData);

// Helper function to get auction data for a specific land
export function getAuctionData(landId: number): AuctionData | undefined {
  return mockAuctionData.get(landId);
}

export const playerLands = derived(landStore, ($landStore) =>
  $landStore.filter((land) => land.owner === mockPlayerAddress),
);
