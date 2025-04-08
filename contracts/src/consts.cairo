pub const GRID_WIDTH: u64 = 64;
//this % is for tests now
pub const TAX_RATE: u64 = 2;
pub const BASE_TIME: u64 = 3600;
pub const PRICE_DECREASE_RATE: u64 = 2;
pub const TIME_SPEED: u32 = 20;
pub const MAX_AUCTIONS: u8 = 16;
pub const DECAY_RATE: u64 = 200;
pub const FLOOR_PRICE: u256 = DECIMALS_FACTOR / 10;
pub const OUR_CONTRACT_SEPOLIA_ADDRESS: felt252 =
    0x04F6a506b6feb38A670526241E7b81CAb84006D696a3C9C6fEF99F4dC8765A26;
pub const TWO_DAYS_IN_SECONDS: u64 = 2 * 24 * 60 * 60;
pub const FOUR_DAYS_IN_SECONDS: u64 = TWO_DAYS_IN_SECONDS * 2;
pub const LIQUIDITY_SAFETY_MULTIPLIER: u8 = 3;
pub const MIN_AUCTION_PRICE: u256 = 500 * DECIMALS_FACTOR; // 10
pub const FACTOR_FOR_SELL_PRICE: u8 = 10; // 10x the sale price at the start
pub const DECIMALS_FACTOR: u256 = 1_000_000_000_000_000_000;
