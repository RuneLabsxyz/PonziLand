//! This file contains default configuration values used EXCLUSIVELY for testing purposes.
//! These values are not used directly by the contract during runtime.
//!
//! The actual configuration values are stored in the on-chain `Config` model and can be modified
//! by the contract owner through the configuration system. These test constants are only used to:
//! 1. Initialize the contract in test environments
//! 2. Provide default values for test cases
//! 3. Serve as reference for expected value ranges
//!
//! To modify these values in production, use the configuration system's update methods.

pub const MAX_GRID_SIZE: u8 = 255;

//this % is for tests now
pub const TAX_RATE: u8 = 2;
pub const BASE_TIME: u16 = 3600;
pub const PRICE_DECREASE_RATE: u8 = 2;
pub const TIME_SPEED: u8 = 5;
pub const MAX_AUCTIONS: u8 = 16;
pub const MAX_AUCTIONS_FROM_BID: u8 = 3;
pub const DECAY_RATE: u16 = 100;
pub const FLOOR_PRICE: u256 = DECIMALS_FACTOR / 10;
pub const OUR_CONTRACT_SEPOLIA_ADDRESS: felt252 =
    0x021fBAE9F9343873ab25eC14d287A1170b676C73c97906790ef91F5428dBdbad;
pub const TWO_DAYS_IN_SECONDS: u32 = 2 * 24 * 60 * 60;
pub const FOUR_DAYS_IN_SECONDS: u32 = TWO_DAYS_IN_SECONDS * 2;
pub const LIQUIDITY_SAFETY_MULTIPLIER: u8 = 3;
pub const MIN_AUCTION_PRICE: u256 = 500 * DECIMALS_FACTOR; // 10
pub const MIN_AUCTION_PRICE_MULTIPLIER: u8 = 10; // 10x the sale price at the start
pub const DECIMALS_FACTOR: u256 = 1_000_000_000_000_000_000;
pub const CENTER_LOCATION: u16 = 32639;
pub const MAX_CIRCLES: u16 = 127;


pub const SCALE_FACTOR_FOR_FEE: u128 = 10_000_000;
pub const CLAIM_FEE: u128 = 900_000;
pub const BUY_FEE: u128 = 990_000;
// 10 is for easier tests
pub const CLAIM_FEE_THRESHOLD: u128 = 10; //1_000_000_000_000_000; // 1e15
pub const OUR_CONTRACT_FOR_FEE: felt252 =
    0x021fBAE9F9343873ab25eC14d287A1170b676C73c97906790ef91F5428dBdbac;

const AUCTION_DURATION: u32 = 7 * 24 * 60 * 60; // 1 week in seconds

const SCALING_FACTOR: u8 = 50;
const LINEAR_DECAY_TIME: u16 = 10 * 60 * 20; // 10 minutes IRL
// (not dependent on time speed, so * TIME_SPEED, but due to the wrong unit, we cannot use the
// variable directly)

const DROP_RATE: u8 = 90; // 90% of the price or 9/10
const RATE_DENOMINATOR: u8 = 100; // To get a percentage
