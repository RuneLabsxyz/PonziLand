pub const GRID_WIDTH: u64 = 64;
//this % is for tests now
pub const TAX_RATE: u64 = 2;
pub const BASE_TIME: u64 = 3600;
pub const PRICE_DECREASE_RATE: u64 = 2;
pub const TIME_SPEED: u32 = 4;
pub const MAX_AUCTIONS: u8 = 10;
pub const DECAY_RATE: u64 = 100;
//TODO:The floor price can be an u8, depends how we want to handle it
pub const FLOOR_PRICE: u256 = 1;
const TWO_DAYS_IN_SECONDS: u64 = 2 * 24 * 60 * 60; // 2 days in seconds;
const FOUR_DAYS_IN_SECONDS: u64 = TWO_DAYS_IN_SECONDS * 2;

