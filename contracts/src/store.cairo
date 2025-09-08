use dojo::model::{Model, ModelStorage, ModelValueStorage};
use dojo::world::WorldStorage;
use ponzi_land::models::auction::Auction;
use ponzi_land::models::config::Config;
use ponzi_land::models::land::{Land, LandStake, PoolKey};
use starknet::ContractAddress;
use starknet::contract_address::ContractAddressZeroable;

#[derive(Copy, Drop)]
struct Store {
    world: WorldStorage,
}

#[generate_trait]
impl StoreImpl of StoreTrait {
    #[inline(always)]
    fn new(world: WorldStorage) -> Store {
        Store { world }
    }

    // Getter
    #[inline(always)]
    fn land(self: Store, land_location: u16) -> Land {
        self.world.read_model(land_location)
    }

    #[inline(always)]
    fn land_stake(self: Store, land_location: u16) -> LandStake {
        self.world.read_model(land_location)
    }

    #[inline(always)]
    fn auction(self: Store, land_location: u16) -> Auction {
        self.world.read_model(land_location)
    }

    // Setter
    #[inline(always)]
    fn set_land(mut self: Store, land: Land) {
        self.world.write_model(@land);
    }

    #[inline(always)]
    fn set_land_stake(mut self: Store, land_stake: LandStake) {
        self.world.write_model(@land_stake);
    }

    #[inline(always)]
    fn set_auction(mut self: Store, auction: Auction) {
        self.world.write_model(@auction);
    }

    // Deleter
    #[inline(always)]
    fn delete_land(mut self: Store, mut land: Land, mut land_stake: LandStake) {
        //Red: Attempt to see if it is still an issue with torii:
        self.world.erase_model(@land);
        self.world.erase_model(@land_stake);
    }

    // Config getters

    #[inline(always)]
    fn get_tax_rate(self: Store) -> u8 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("tax_rate"))
    }

    #[inline(always)]
    fn get_base_time(self: Store) -> u16 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("base_time"))
    }

    #[inline(always)]
    fn get_price_decrease_rate(self: Store) -> u8 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("price_decrease_rate"))
    }

    #[inline(always)]
    fn get_time_speed(self: Store) -> u8 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("time_speed"))
    }

    #[inline(always)]
    fn get_max_auctions(self: Store) -> u8 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("max_auctions"))
    }

    #[inline(always)]
    fn get_max_auctions_from_bid(self: Store) -> u8 {
        self
            .world
            .read_member(Model::<Config>::ptr_from_keys(1), selector!("max_auctions_from_bid"))
    }

    #[inline(always)]
    fn get_decay_rate(self: Store) -> u16 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("decay_rate"))
    }

    #[inline(always)]
    fn get_floor_price(self: Store) -> u256 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("floor_price"))
    }

    #[inline(always)]
    fn get_liquidity_safety_multiplier(self: Store) -> u8 {
        self
            .world
            .read_member(
                Model::<Config>::ptr_from_keys(1), selector!("liquidity_safety_multiplier"),
            )
    }

    #[inline(always)]
    fn get_min_auction_price(self: Store) -> u256 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("min_auction_price"))
    }

    #[inline(always)]
    fn get_min_auction_price_multiplier(self: Store) -> u8 {
        self
            .world
            .read_member(
                Model::<Config>::ptr_from_keys(1), selector!("min_auction_price_multiplier"),
            )
    }

    #[inline(always)]
    fn get_auction_duration(self: Store) -> u32 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("auction_duration"))
    }

    #[inline(always)]
    fn get_scaling_factor(self: Store) -> u8 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("scaling_factor"))
    }

    #[inline(always)]
    fn get_linear_decay_time(self: Store) -> u16 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("linear_decay_time"))
    }

    #[inline(always)]
    fn get_drop_rate(self: Store) -> u8 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("drop_rate"))
    }

    #[inline(always)]
    fn get_rate_denominator(self: Store) -> u8 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("rate_denominator"))
    }

    #[inline(always)]
    fn get_max_circles(self: Store) -> u16 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("max_circles"))
    }

    #[inline(always)]
    fn get_claim_fee(self: Store) -> u128 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("claim_fee"))
    }

    #[inline(always)]
    fn get_claim_fee_threshold(self: Store) -> u128 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("claim_fee_threshold"))
    }

    #[inline(always)]
    fn get_buy_fee(self: Store) -> u128 {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("buy_fee"))
    }

    #[inline(always)]
    fn get_our_contract_for_fee(self: Store) -> ContractAddress {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("our_contract_for_fee"))
    }

    #[inline(always)]
    fn get_our_contract_for_auction(self: Store) -> ContractAddress {
        self
            .world
            .read_member(Model::<Config>::ptr_from_keys(1), selector!("our_contract_for_auction"))
    }

    #[inline(always)]
    fn get_main_currency(self: Store) -> ContractAddress {
        self.world.read_member(Model::<Config>::ptr_from_keys(1), selector!("main_currency"))
    }
}
