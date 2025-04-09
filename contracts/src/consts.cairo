pub const GRID_WIDTH: u64 = 64;
//this % is for tests now
pub const TAX_RATE: u64 = 2;
pub const BASE_TIME: u64 = 3600;
pub const PRICE_DECREASE_RATE: u64 = 2;
pub const TIME_SPEED: u32 = 20;
pub const MAX_AUCTIONS: u8 = 16;
pub const MAX_AUCTIONS_FROM_BID: u8 = 3;
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
pub const CENTER_LOCATION:u64 = 2080;

const AUCTION_DURATION: u256 = 7 * 24 * 60 * 60; // 1 week in seconds

const SCALING_FACTOR: u8 = 50;
const LINEAR_DECAY_TIME: u64 = 10 * 60 * 20; // 10 minutes IRL
// (not dependent on time speed, so * TIME_SPEED, but due to the wrong unit, we cannot use the
// variable directly)

const DROP_RATE: u8 = 90; // 90% of the price or 9/10
const RATE_DENOMINATOR: u8 = 100; // To get a percentage
