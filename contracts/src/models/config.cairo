use dojo::model::{ModelStorage, ModelValueStorage};
use dojo::world::WorldStorage;
use ponzi_land::consts::{
    AUCTION_DURATION, BASE_TIME, BUY_FEE, CLAIM_FEE, CLAIM_FEE_THRESHOLD, DECAY_RATE, DROP_RATE,
    FLOOR_PRICE, LINEAR_DECAY_TIME, LIQUIDITY_SAFETY_MULTIPLIER, MAX_AUCTIONS,
    MAX_AUCTIONS_FROM_BID, MAX_CIRCLES, MIN_AUCTION_PRICE, MIN_AUCTION_PRICE_MULTIPLIER,
    OUR_CONTRACT_SEPOLIA_ADDRESS, PRICE_DECREASE_RATE, QUEST_LANDS_ENABLED, QUEST_REWARDS_ENABLED,
    RATE_DENOMINATOR, SCALING_FACTOR, TAX_RATE, TIME_SPEED,
};
/// @title Config Model for PonziLand
/// @notice Model for global configuration parameters in PonziLand.
use starknet::ContractAddress;

/// Global configuration for the PonziLand game.
/// * `id` - Unique identifier for the config (always 1 for singleton pattern).
/// * `tax_rate` - Base tax rate applied to land yields.
/// * `base_time` - Base time unit for time-based calculations.
/// * `price_decrease_rate` - Rate at which auction prices decrease over time.
/// * `time_speed` - Multiplier for in-game time progression.
/// * `max_auctions` - Maximum number of concurrent auctions allowed.
/// * `max_auctions_from_bid` - Maximum number of auctions that can be created from a bid event.
/// * `decay_rate` - Decay rate for auction price formulas.
/// * `floor_price` - Minimum price for any auction.
/// * `liquidity_safety_multiplier` - Multiplier to ensure sufficient liquidity in pools.
/// * `min_auction_price` - Minimum starting price for auctions.
/// * `min_auction_price_multiplier` - Multiplier for calculating minimum auction price based on
/// neighbors.
/// * `auction_duration` - Duration of each auction in seconds.
/// * `scaling_factor` - Scaling factor for price decay calculations.
/// * `linear_decay_time` - Time period for linear price decay before switching to exponential.
/// * `drop_rate` - Rate at which price drops during linear decay.
/// * `rate_denominator` - Denominator for rate calculations in price decay.
/// * `max_circles` - Maximum number of concentric circles of land expansion.
/// * `claim_fee` - Fee charged when claiming land yield above a threshold.
/// * `buy_fee` - Fee charged when buying land.
/// * `our_contract_for_fee` - Address to which claim and buy fees are sent.
/// * `our_contract_for_auction` - Address to which auction proceeds are sent.
/// * `claim_fee_threshold` - Minimum amount required before a claim fee is charged. Used in claim
/// logic to avoid charging small claims.
#[derive(Drop, Serde, Copy, Debug)]
#[dojo::model]
pub struct Config {
    #[key]
    pub id: u8,
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
    pub auction_duration: u32,
    pub scaling_factor: u8,
    pub linear_decay_time: u16,
    pub drop_rate: u8,
    pub rate_denominator: u8,
    pub max_circles: u16,
    pub claim_fee: u128,
    pub buy_fee: u128,
    pub quest_lands_enabled: bool,
    pub quest_rewards_enabled: bool,
    pub our_contract_for_fee: ContractAddress,
    pub our_contract_for_auction: ContractAddress,
    pub claim_fee_threshold: u128,
    pub main_currency: ContractAddress,
}

#[generate_trait]
impl ConfigImpl of ConfigTrait {
    #[inline(always)]
    fn new(
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
        auction_duration: u32,
        scaling_factor: u8,
        linear_decay_time: u16,
        drop_rate: u8,
        rate_denominator: u8,
        max_circles: u16,
        claim_fee: u128,
        buy_fee: u128,
        quest_lands_enabled: bool,
        quest_rewards_enabled: bool,
        our_contract_for_fee: ContractAddress,
        our_contract_for_auction: ContractAddress,
        claim_fee_threshold: u128,
        main_currency: ContractAddress,
    ) -> Config {
        Config {
            id: 1,
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
            auction_duration,
            scaling_factor,
            linear_decay_time,
            drop_rate,
            rate_denominator,
            max_circles,
            claim_fee,
            buy_fee,
            quest_lands_enabled,
            quest_rewards_enabled,
            our_contract_for_fee,
            our_contract_for_auction,
            claim_fee_threshold,
            main_currency,
        }
    }


    #[inline(always)]
    fn initialize_default() -> Config {
        let default_config = Config {
            id: 1,
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
            auction_duration: AUCTION_DURATION,
            scaling_factor: SCALING_FACTOR,
            linear_decay_time: LINEAR_DECAY_TIME,
            drop_rate: DROP_RATE,
            rate_denominator: RATE_DENOMINATOR,
            max_circles: MAX_CIRCLES,
            claim_fee: CLAIM_FEE,
            buy_fee: BUY_FEE,
            quest_rewards_enabled: QUEST_REWARDS_ENABLED,
            quest_lands_enabled: QUEST_LANDS_ENABLED,
            our_contract_for_fee: OUR_CONTRACT_SEPOLIA_ADDRESS.try_into().unwrap(),
            our_contract_for_auction: OUR_CONTRACT_SEPOLIA_ADDRESS.try_into().unwrap(),
            claim_fee_threshold: CLAIM_FEE_THRESHOLD,
            main_currency: OUR_CONTRACT_SEPOLIA_ADDRESS.try_into().unwrap(),
        };
        default_config
    }
}

