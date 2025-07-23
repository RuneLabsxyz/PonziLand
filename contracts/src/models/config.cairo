use starknet::ContractAddress;
use dojo::world::{WorldStorage};
use dojo::model::{ModelStorage, ModelValueStorage};
use ponzi_land::consts::{
    GRID_WIDTH, TAX_RATE, BASE_TIME, PRICE_DECREASE_RATE, TIME_SPEED, MAX_AUCTIONS,
    MAX_AUCTIONS_FROM_BID, DECAY_RATE, FLOOR_PRICE, LIQUIDITY_SAFETY_MULTIPLIER, MIN_AUCTION_PRICE,
    MIN_AUCTION_PRICE_MULTIPLIER, CENTER_LOCATION, AUCTION_DURATION, SCALING_FACTOR,
    LINEAR_DECAY_TIME, DROP_RATE, RATE_DENOMINATOR, MAX_CIRCLES, CLAIM_FEE, BUY_FEE,
    OUR_CONTRACT_SEPOLIA_ADDRESS,
};

#[derive(Drop, Serde, Copy, Debug)]
#[dojo::model]
pub struct Config {
    #[key]
    pub id: u8,
    pub grid_width: u8,
    pub tax_rate: u8,
    pub base_time: u16,
    pub price_decrease_rate: u8,
    pub time_speed: u8,
    pub max_auctions: u8,
    pub max_auctions_from_bid: u8,
    pub decay_rate: u16,
    pub floor_price: u256,
    pub liquidity_safety_multiplier: u8,
    pub min_auction_price: u256,
    pub min_auction_price_multiplier: u8,
    pub center_location: u16,
    pub auction_duration: u32,
    pub scaling_factor: u8,
    pub linear_decay_time: u16,
    pub drop_rate: u8,
    pub rate_denominator: u8,
    pub max_circles: u16,
    pub claim_fee: u128,
    pub buy_fee: u128,
    pub our_contract_for_fee: ContractAddress,
    pub our_contract_for_auction: ContractAddress,
}

#[generate_trait]
impl ConfigImpl of ConfigTrait {
    #[inline(always)]
    fn new(
        grid_width: u8,
        tax_rate: u8,
        base_time: u16,
        price_decrease_rate: u8,
        time_speed: u8,
        max_auctions: u8,
        max_auctions_from_bid: u8,
        decay_rate: u16,
        floor_price: u256,
        liquidity_safety_multiplier: u8,
        min_auction_price: u256,
        min_auction_price_multiplier: u8,
        center_location: u16,
        auction_duration: u32,
        scaling_factor: u8,
        linear_decay_time: u16,
        drop_rate: u8,
        rate_denominator: u8,
        max_circles: u16,
        claim_fee: u128,
        buy_fee: u128,
        our_contract_for_fee: ContractAddress,
        our_contract_for_auction: ContractAddress,
    ) -> Config {
        Config {
            id: 1,
            grid_width,
            tax_rate,
            base_time,
            price_decrease_rate,
            time_speed,
            max_auctions,
            max_auctions_from_bid,
            decay_rate,
            floor_price,
            liquidity_safety_multiplier,
            min_auction_price,
            min_auction_price_multiplier,
            center_location,
            auction_duration,
            scaling_factor,
            linear_decay_time,
            drop_rate,
            rate_denominator,
            max_circles,
            claim_fee,
            buy_fee,
            our_contract_for_fee,
            our_contract_for_auction,
        }
    }


    #[inline(always)]
    fn initialize_default() -> Config {
        let default_config = Config {
            id: 1,
            grid_width: GRID_WIDTH,
            tax_rate: TAX_RATE,
            base_time: BASE_TIME,
            price_decrease_rate: PRICE_DECREASE_RATE,
            time_speed: TIME_SPEED,
            max_auctions: MAX_AUCTIONS,
            max_auctions_from_bid: MAX_AUCTIONS_FROM_BID,
            decay_rate: DECAY_RATE,
            floor_price: FLOOR_PRICE,
            liquidity_safety_multiplier: LIQUIDITY_SAFETY_MULTIPLIER,
            min_auction_price: MIN_AUCTION_PRICE,
            min_auction_price_multiplier: MIN_AUCTION_PRICE_MULTIPLIER,
            center_location: CENTER_LOCATION,
            auction_duration: AUCTION_DURATION,
            scaling_factor: SCALING_FACTOR,
            linear_decay_time: LINEAR_DECAY_TIME,
            drop_rate: DROP_RATE,
            rate_denominator: RATE_DENOMINATOR,
            max_circles: MAX_CIRCLES,
            claim_fee: CLAIM_FEE,
            buy_fee: BUY_FEE,
            our_contract_for_fee: OUR_CONTRACT_SEPOLIA_ADDRESS.try_into().unwrap(),
            our_contract_for_auction: OUR_CONTRACT_SEPOLIA_ADDRESS.try_into().unwrap(),
        };
        default_config
    }
}

