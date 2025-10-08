import { describe, expect, it, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { ParsedEntity } from '@dojoengine/sdk';
import { LandTileStore } from './land_tiles.svelte';
import type { Auction, Land, LandStake, SchemaType } from '$lib/models.gen';
import { EmptyLand } from './land';
import { AuctionLand } from './land/auction_land';
import { BuildingLand } from './land/building_land';
import { coordinatesToLocation } from '$lib/utils';

// Mock store imports
vi.mock('$lib/stores/sfx.svelte', () => ({
  gameSounds: { play: vi.fn() },
}));

vi.mock('$lib/stores/claim.store.svelte', () => ({
  claimStore: { value: {} },
}));

vi.mock('$lib/stores/nuke.store.svelte', () => ({
  nukeStore: {
    animationManager: {
      triggerAnimation: vi.fn(),
      clearAllAnimations: vi.fn(),
    },
  },
}));

// Mock the subscription setup
vi.mock('./land/torii', () => ({
  setupLandsSubscription: vi.fn().mockResolvedValue({
    initialEntities: [],
    subscription: { cancel: vi.fn() },
  }),
}));

// Mock land actions
vi.mock('$lib/utils/land-actions', () => ({
  createLandWithActions: vi.fn(),
}));

// Mock dev settings
vi.mock(
  '$lib/components/+game-map/three/utils/devsettings.store.svelte',
  () => ({
    devsettings: {
      minRandomUpdates: 1,
      maxRandomUpdates: 5,
      nukeRate: 0.1,
      updateInterval: 1000,
    },
  }),
);

// Test tokens and constants
const TEST_TOKEN_ADDRESS =
  '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const TEST_AUCTION_TOKEN_ADDRESS =
  '0x07718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938e';
const TEST_OWNER =
  '0x05144466224fde5d648d6295a2fb6e7cd45f2ca3ede06196728026f12c84c9ff';
const TEST_LOCATION = coordinatesToLocation({ x: 5, y: 5 });

// Helper function to create a mock ParsedEntity
function createMockEntity(
  models: Partial<SchemaType['ponzi_land']>,
): ParsedEntity<SchemaType> {
  return {
    entityId: '0x123',
    models: {
      ponzi_land: models as SchemaType['ponzi_land'],
    },
  } as ParsedEntity<SchemaType>;
}

// Helper function to create a land model
function createLandModel(overrides: Partial<Land> = {}): Land {
  return {
    location: TEST_LOCATION,
    block_date_bought: Date.now() / 1000,
    owner: TEST_OWNER,
    sell_price: '1000000000000000000',
    token_used: TEST_TOKEN_ADDRESS,
    level: 'First' as any,
    ...overrides,
  };
}

// Helper function to create an auction model
function createAuctionModel(overrides: Partial<Auction> = {}): Auction {
  return {
    land_location: TEST_LOCATION,
    start_time: Date.now() / 1000,
    start_price: '1000000000000000000',
    floor_price: '500000000000000000',
    is_finished: false,
    sold_at_price: { None: {} } as any,
    ...overrides,
  };
}

// Helper function to create a land stake model
function createLandStakeModel(overrides: Partial<LandStake> = {}): LandStake {
  return {
    location: TEST_LOCATION,
    amount: '2000000000000000000',
    neighbors_info_packed: 0,
    accumulated_taxes_fee: 0,
    ...overrides,
  };
}

describe('LandTileStore', () => {
  let landStore: LandTileStore;

  beforeEach(() => {
    landStore = new LandTileStore();
    vi.clearAllMocks();
  });

  describe('Basic initialization', () => {
    it('should initialize with empty lands', () => {
      const land = landStore.getLand(5, 5);
      expect(land).toBeDefined();

      const landValue = get(land!);
      expect(landValue).toBeInstanceOf(EmptyLand);
      expect(landValue.location).toEqual({ x: 5, y: 5 });
    });

    it('should return undefined for out-of-bounds coordinates', () => {
      expect(landStore.getLand(-1, 5)).toBeUndefined();
      expect(landStore.getLand(5, -1)).toBeUndefined();
    });
  });

  describe('Land entity updates', () => {
    it('should create BuildingLand when receiving only land model', () => {
      const landModel = createLandModel();
      const entity = createMockEntity({ Land: landModel });

      landStore.updateLand(entity);

      const land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(BuildingLand);
      expect((land as BuildingLand).owner).toBe(TEST_OWNER);
      expect((land as BuildingLand).token_used).toBe(TEST_TOKEN_ADDRESS);
    });

    it('should create BuildingLand with stake when receiving both land and stake models', () => {
      const landModel = createLandModel();
      const stakeModel = createLandStakeModel();
      const entity = createMockEntity({
        Land: landModel,
        LandStake: stakeModel,
      });

      landStore.updateLand(entity);

      const land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(BuildingLand);
      expect((land as BuildingLand).stakeAmount?.toBigint()).toBe(
        BigInt(stakeModel.amount),
      );
    });

    it('should store pending stake when receiving only stake model for empty land', () => {
      const stakeModel = createLandStakeModel();
      const entity = createMockEntity({ LandStake: stakeModel });

      landStore.updateLand(entity);

      // Land should remain empty
      const land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(EmptyLand);

      // When we later receive land model, stake should be applied
      const landModel = createLandModel();
      const landEntity = createMockEntity({ Land: landModel });

      landStore.updateLand(landEntity);

      const updatedLand = get(landStore.getLand(5, 5)!) as BuildingLand;
      expect(updatedLand).toBeInstanceOf(BuildingLand);
      expect(updatedLand.stakeAmount?.toBigint()).toBe(
        BigInt(stakeModel.amount),
      );
    });
  });

  describe('Auction entity updates', () => {
    it('should create AuctionLand when receiving auction model with land model', () => {
      const landModel = createLandModel();
      const auctionModel = createAuctionModel();
      const entity = createMockEntity({
        Land: landModel,
        Auction: auctionModel,
      });

      landStore.updateLand(entity);

      const land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(AuctionLand);
      expect((land as AuctionLand).isFinished).toBe(false);
    });

    it('should create AuctionLand from existing BuildingLand', () => {
      // First create a building land
      const landModel = createLandModel();
      const entity = createMockEntity({ Land: landModel });
      landStore.updateLand(entity);

      // Verify it's a building land
      let land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(BuildingLand);

      // Now add auction to it
      const auctionModel = createAuctionModel();
      const auctionEntity = createMockEntity({ Auction: auctionModel });
      landStore.updateLand(auctionEntity);

      // Should become auction land
      land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(AuctionLand);
      expect((land as AuctionLand).isFinished).toBe(false);
    });

    it('should update existing AuctionLand when receiving new auction data', () => {
      // Create initial auction land
      const landModel = createLandModel();
      const auctionModel = createAuctionModel({
        start_price: '1000000000000000000',
      });
      const entity = createMockEntity({
        Land: landModel,
        Auction: auctionModel,
      });
      landStore.updateLand(entity);

      // Verify initial state
      let land = get(landStore.getLand(5, 5)!) as AuctionLand;
      expect(land).toBeInstanceOf(AuctionLand);
      expect(land.startPrice.toBigint()).toBe(1000000000000000000n);

      // Update with new auction data
      const updatedAuctionModel = createAuctionModel({
        start_price: '2000000000000000000',
      });
      const updateEntity = createMockEntity({
        Land: landModel,
        Auction: updatedAuctionModel,
      });
      landStore.updateLand(updateEntity);

      // Should update the auction data
      land = get(landStore.getLand(5, 5)!) as AuctionLand;
      expect(land.startPrice.toBigint()).toBe(2000000000000000000n);
    });

    it('should preserve auction when receiving land update for ongoing auction', () => {
      // Create auction land
      const landModel = createLandModel();
      const auctionModel = createAuctionModel({ is_finished: false });
      const entity = createMockEntity({
        Land: landModel,
        Auction: auctionModel,
      });
      landStore.updateLand(entity);

      // Verify it's an auction land
      let land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(AuctionLand);

      // Now receive a land update (this simulates the case where we get
      // land updates for a tile that already has an ongoing auction)
      const updatedLandModel = createLandModel({
        owner: '0x00',
        sell_price: '2000000000000000000',
      });
      const landUpdateEntity = createMockEntity({ Land: updatedLandModel });
      landStore.updateLand(landUpdateEntity);

      // Should still be auction land, not converted to building land
      land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(AuctionLand);
      expect((land as AuctionLand).isFinished).toBe(false);
    });

    it('should convert to BuildingLand when getting a land with a new owner other than 0x00', () => {
      // Create auction land
      const landModel = createLandModel();
      const auctionModel = createAuctionModel({ is_finished: false });
      const entity = createMockEntity({
        Land: landModel,
        Auction: auctionModel,
      });
      landStore.updateLand(entity);

      // Verify it's auction land
      let land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(AuctionLand);

      // Update with land having a new owner (not 0x00)
      const newOwner =
        '0x07144466224fde5d648d6295a2fb6e7cd45f2ca3ede06196728026f12c84c9bb';
      const buildingLandModel = createLandModel({ owner: newOwner });
      const buildingEntity = createMockEntity({ Land: buildingLandModel });

      landStore.updateLand(buildingEntity);

      // Should convert to BuildingLand
      land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(BuildingLand);
      expect((land as BuildingLand).owner).toBe(newOwner);
    });
  });

  describe('Complex update sequences', () => {
    it('empty -> stake -> land (applies pending stake)', () => {
      // Start with empty land
      let land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(EmptyLand);

      // Receive stake update first
      const stakeModel = createLandStakeModel({
        amount: '3000000000000000000',
      });
      const stakeEntity = createMockEntity({ LandStake: stakeModel });
      landStore.updateLand(stakeEntity);

      // Should still be empty
      land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(EmptyLand);

      // Then receive land update
      const landModel = createLandModel();
      const landEntity = createMockEntity({ Land: landModel });
      landStore.updateLand(landEntity);

      // Should become building land with pending stake applied
      land = get(landStore.getLand(5, 5)!) as BuildingLand;
      expect(land).toBeInstanceOf(BuildingLand);
      expect(land.stakeAmount?.toBigint()).toBe(BigInt(stakeModel.amount));
    });

    it('empty -> auction -> land (preserves auction)', () => {
      // Start with empty land
      let land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(EmptyLand);

      // Receive auction update first
      const auctionModel = createAuctionModel();
      const auctionEntity = createMockEntity({ Auction: auctionModel });
      landStore.updateLand(auctionEntity);

      // Should become auction land
      land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(AuctionLand);

      // Then receive land update
      const landModel = createLandModel({ owner: '0x00' }); // Owner = 0x00 to indicate no direct ownership
      const landEntity = createMockEntity({ Land: landModel });
      landStore.updateLand(landEntity);

      // Should remain auction land (not become building land)
      land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(AuctionLand);
      expect((land as AuctionLand).isFinished).toBe(false);
    });

    it('building -> auction -> land update (preserves auction)', () => {
      // Create building land first
      const landModel = createLandModel();
      const entity = createMockEntity({ Land: landModel });
      landStore.updateLand(entity);

      let land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(BuildingLand);

      // Convert to auction
      const auctionModel = createAuctionModel();
      const auctionEntity = createMockEntity({ Auction: auctionModel });
      landStore.updateLand(auctionEntity);

      land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(AuctionLand);

      // Receive another land update
      const updatedLandModel = createLandModel({
        owner: '0x00',
        sell_price: '5000000000000000000',
      });
      const landUpdateEntity = createMockEntity({ Land: updatedLandModel });
      landStore.updateLand(landUpdateEntity);

      // Should still be auction land
      land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(AuctionLand);
      expect((land as AuctionLand).isFinished).toBe(false);
    });

    it('auction -> stake -> auction finished -> building land (applies the stake)', () => {
      // Create auction
      const auctionModel = createAuctionModel();
      const auctionEntity = createMockEntity({ Auction: auctionModel });
      landStore.updateLand(auctionEntity);

      let land = get(landStore.getLand(5, 5)!) as AuctionLand;
      expect(land).toBeInstanceOf(AuctionLand);

      // Update stake
      const stakeModel = createLandStakeModel({
        amount: '4000000000000000000',
      });
      const stakeEntity = createMockEntity({ LandStake: stakeModel });
      landStore.updateLand(stakeEntity);

      // Should still be auction
      land = get(landStore.getLand(5, 5)!) as AuctionLand;
      expect(land).toBeInstanceOf(AuctionLand);

      // Finish auction
      const finishedAuctionModel = createAuctionModel({ is_finished: true });
      const finishedAuctionEntity = createMockEntity({
        Auction: finishedAuctionModel,
      });
      landStore.updateLand(finishedAuctionEntity);

      // Should still be auction land but finished
      land = get(landStore.getLand(5, 5)!) as AuctionLand;
      expect(land).toBeInstanceOf(AuctionLand);
      expect(land.isFinished).toBe(true);

      // Update land - should become BuildingLand with stake applied
      const landModel = createLandModel({ owner: TEST_OWNER });
      const landEntity = createMockEntity({ Land: landModel });
      landStore.updateLand(landEntity);

      const buildingLand = get(landStore.getLand(5, 5)!) as BuildingLand;
      expect(buildingLand).toBeInstanceOf(BuildingLand);
      expect(buildingLand.stakeAmount?.toBigint()).toBe(
        BigInt(stakeModel.amount),
      );
    });

    it('should handle owner change in land updates', () => {
      const originalOwner = TEST_OWNER;
      const newOwner =
        '0x07144466224fde5d648d6295a2fb6e7cd45f2ca3ede06196728026f12c84c9aa';

      // Create building land with original owner
      const landModel = createLandModel({ owner: originalOwner });
      const entity = createMockEntity({ Land: landModel });
      landStore.updateLand(entity);

      let land = get(landStore.getLand(5, 5)!) as BuildingLand;
      expect(land.owner).toBe(originalOwner);

      // Update with new owner
      const updatedLandModel = createLandModel({ owner: newOwner });
      const updateEntity = createMockEntity({ Land: updatedLandModel });
      landStore.updateLand(updateEntity);

      land = get(landStore.getLand(5, 5)!) as BuildingLand;
      expect(land.owner).toBe(newOwner);
    });

    it('should convert BuildingLand to AuctionLand with different token (nuking scenario)', () => {
      // Create building land with one token
      const landModel = createLandModel({
        token_used: TEST_TOKEN_ADDRESS,
        owner: TEST_OWNER,
        sell_price: '1000000000000000000',
      });
      const entity = createMockEntity({ Land: landModel });
      landStore.updateLand(entity);

      // Verify it's building land with original token
      let land = get(landStore.getLand(5, 5)!) as BuildingLand;
      expect(land).toBeInstanceOf(BuildingLand);
      expect(land.token_used).toBe(TEST_TOKEN_ADDRESS);
      expect(land.owner).toBe(TEST_OWNER);

      // Create auction with different token (simulating nuking with different token)
      const auctionModel = createAuctionModel({
        start_price: '2000000000000000000',
        floor_price: '500000000000000000',
        is_finished: false,
      });
      const auctionEntity = createMockEntity({
        Auction: auctionModel,
      });

      landStore.updateLand(auctionEntity);

      // Send separate land update with new token (as would happen in real nuking)
      const landWithAuctionModel = createLandModel({
        token_used: TEST_AUCTION_TOKEN_ADDRESS, // Different token for auction
        owner: '0x00', // Auction land has no direct owner
        sell_price: '0',
      });
      const landEntity = createMockEntity({
        Land: landWithAuctionModel,
      });
      landStore.updateLand(landEntity);

      // Should become auction land with auction token, not building token
      const auctionLand = get(landStore.getLand(5, 5)!) as AuctionLand;
      expect(auctionLand).toBeInstanceOf(AuctionLand);
      expect(auctionLand.token_used).toBe(TEST_AUCTION_TOKEN_ADDRESS); // Should use auction token
      expect(auctionLand.isFinished).toBe(false);
      expect(auctionLand.startPrice.toBigint()).toBe(2000000000000000000n);
      expect(auctionLand.floorPrice.toBigint()).toBe(500000000000000000n);
    });
  });

  describe('Edge cases', () => {
    it('should handle auction model with owner = 0 (empty update)', () => {
      // Create auction land
      const landModel = createLandModel();
      const auctionModel = createAuctionModel();
      const entity = createMockEntity({
        Land: landModel,
        Auction: auctionModel,
      });
      landStore.updateLand(entity);

      let land = get(landStore.getLand(5, 5)!);
      expect(land).toBeInstanceOf(AuctionLand);

      // Receive land update with owner = 0 (should be ignored)
      const emptyLandModel = createLandModel({ owner: '0x0' });
      const emptyEntity = createMockEntity({ Land: emptyLandModel });
      landStore.updateLand(emptyEntity);

      // Should remain unchanged
      const unchangedLand = get(landStore.getLand(5, 5)!);
      expect(unchangedLand).toBeInstanceOf(AuctionLand);
      expect(unchangedLand).toBe(land); // Same reference, no change
    });

    it('should preserve stake when updating BuildingLand without new stake', () => {
      // Create building land with stake
      const landModel = createLandModel();
      const stakeModel = createLandStakeModel({
        amount: '2000000000000000000',
      });
      const entity = createMockEntity({
        Land: landModel,
        LandStake: stakeModel,
      });
      landStore.updateLand(entity);

      let land = get(landStore.getLand(5, 5)!) as BuildingLand;
      expect(land.stakeAmount?.toBigint()).toBe(BigInt(stakeModel.amount));

      // Update land without new stake data
      const updatedLandModel = createLandModel({
        sell_price: '3000000000000000000',
      });
      const updateEntity = createMockEntity({ Land: updatedLandModel });
      landStore.updateLand(updateEntity);

      // Should preserve the original stake
      land = get(landStore.getLand(5, 5)!) as BuildingLand;
      expect(land.stakeAmount?.toBigint()).toBe(BigInt(stakeModel.amount));
      expect(land.sell_price).toBe('3000000000000000000');
    });

    it('should handle multiple coordinate locations', () => {
      const locations = [
        { x: 0, y: 0 },
        { x: 10, y: 15 },
        { x: 49, y: 49 }, // Max coordinates
      ];

      locations.forEach(({ x, y }) => {
        const location = coordinatesToLocation({ x, y });
        const landModel = createLandModel({ location });
        const entity = createMockEntity({ Land: landModel });

        landStore.updateLand(entity);

        const land = get(landStore.getLand(x, y)!) as BuildingLand;
        expect(land).toBeInstanceOf(BuildingLand);
        expect(land.location).toEqual({ x, y });
      });
    });
  });

  describe('Direct land updates', () => {
    it('should allow direct land updates', () => {
      const buildingLand = new BuildingLand(createLandModel());
      landStore.updateLandDirectly(5, 5, buildingLand);

      const land = get(landStore.getLand(5, 5)!);
      expect(land).toBe(buildingLand);
    });

    it('should ignore out-of-bounds direct updates', () => {
      const buildingLand = new BuildingLand(createLandModel());
      landStore.updateLandDirectly(-1, 5, buildingLand); // Should not throw
      landStore.updateLandDirectly(100, 5, buildingLand); // Should not throw
    });
  });
});
