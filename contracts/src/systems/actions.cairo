use dojo::world::WorldStorage;
use ponzi_land::models::auction::Auction;
use ponzi_land::models::land::{Land, LandStake};
use ponzi_land::utils::common_strucs::{ClaimInfo, LandOrAuction, LandYieldInfo, TokenInfo};
/// @title PonziLand Game Actions
/// @notice Main entry point for all game interactions
/// This contract handles all player actions and game mechanics

use starknet::ContractAddress;

#[starknet::interface]
trait IActions<T> {
    /// @notice Place a bid on a land when the auction is active and setting a sell price for the
    /// land @param land_location The location ID of the land
    /// @param token_for_sale The token address being used for the sale and for stake
    /// @param sell_price The new price of the land with the new owner
    /// @param amount_to_stake The amount of tokens to stake with the bid to pay taxes
    fn bid(
        ref self: T,
        land_location: u16,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
    );

    /// @notice Purchase a land that is for sale from another user
    /// @param land_location The location ID of the land
    /// @param token_for_sale The token address being used for the sale and for stake
    /// @param sell_price The agreed sale price
    /// @param amount_to_stake The amount of tokens to stake with purchase to pay taxes
    fn buy(
        ref self: T,
        land_location: u16,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
    );

    /// @notice Recreate an auction for a land
    /// @param land_location The location ID of the land
    fn recreate_auction(ref self: T, land_location: u16);

    /// @notice Claim yield from a land only the owner can claim
    /// @param land_location The location ID of the land
    fn claim(ref self: T, land_location: u16);

    /// @notice Claim yield from multiple lands for the same owner
    /// @param land_locations Array of land location IDs
    fn claim_all(ref self: T, land_locations: Array<u16>);

    /// @notice Increase the price of a land
    /// @param land_location The location ID of the land
    /// @param new_price The new price for the land
    fn increase_price(ref self: T, land_location: u16, new_price: u256);

    /// @notice Increase the stake on a land
    /// @param land_location The location ID of the land
    /// @param amount_to_stake Additional amount to stake
    fn increase_stake(ref self: T, land_location: u16, amount_to_stake: u256);

    /// @notice Level up a land after a certain amount of time has passed to get rate reduction
    /// @param land_location The location ID of the land
    fn level_up(ref self: T, land_location: u16) -> bool;

    /// @notice Reimburse all stakes when the game is over (admin function)
    fn reimburse_stakes(ref self: T);

    fn get_land(self: @T, land_location: u16) -> (Land, LandStake);

    fn get_current_auction_price(self: @T, land_location: u16) -> u256;

    fn get_next_claim_info(self: @T, land_location: u16) -> Array<ClaimInfo>;

    fn get_neighbors_yield(self: @T, land_location: u16) -> LandYieldInfo;

    fn get_active_auctions(self: @T) -> u8;

    fn get_auction(self: @T, land_location: u16) -> Auction;

    fn get_time_to_nuke(self: @T, land_location: u16) -> u64;

    fn get_unclaimed_taxes_per_neighbor(
        self: @T, claimer_location: u16, payer_location: u16,
    ) -> u256;

    fn get_game_speed(self: @T) -> u64;

    fn get_neighbors(self: @T, land_location: u16) -> Array<LandOrAuction>;

    fn get_elapsed_time_since_last_claim(
        self: @T, claimer_location: u16, payer_location: u16,
    ) -> u64;

    fn get_unclaimed_taxes_per_neighbors_total(self: @T, land_location: u16) -> u256;

    fn get_elapsed_time_since_last_claim_for_neighbors(
        self: @T, payer_location: u16,
    ) -> Array<(u16, u64)>;
}

#[dojo::contract]
pub mod actions {
    use core::dict::{Felt252Dict, Felt252DictEntryTrait, Felt252DictTrait};

    // Core Cairo imports
    use core::nullable::{FromNullableResult, Nullable, NullableTrait, match_nullable};
    use dojo::event::EventStorage;

    // Dojo imports
    use dojo::model::{ModelStorage, ModelValueStorage};
    use ekubo::interfaces::core::{ICoreDispatcher, ICoreDispatcherTrait};

    // External dependencies
    use openzeppelin_security::ReentrancyGuardComponent;
    use ponzi_land::components::auction::AuctionComponent;
    use ponzi_land::components::payable::PayableComponent;

    // Components
    use ponzi_land::components::stake::StakeComponent;
    use ponzi_land::components::taxes::TaxesComponent;

    // Constants and store
    use ponzi_land::consts::{CENTER_LOCATION, MAX_GRID_SIZE};

    // Errors
    use ponzi_land::errors::{ERC20_VALIDATE_AMOUNT_BUY};

    // Events
    use ponzi_land::events::{AddStakeEvent, LandBoughtEvent, LandNukedEvent};

    // Helpers
    use ponzi_land::helpers::auction::{get_suggested_sell_price};
    use ponzi_land::helpers::circle_expansion::{
        get_circle_land_position, get_random_available_index, get_random_index,
        is_section_completed, lands_per_section,
    };
    use ponzi_land::helpers::coord::get_all_neighbors;
    use ponzi_land::helpers::land::{
        add_neighbor, update_neighbors_after_delete, update_neighbors_info,
    };
    use ponzi_land::helpers::taxes::{get_tax_rate_per_neighbor, get_taxes_per_neighbor};
    use ponzi_land::interfaces::systems::SystemsTrait;
    use ponzi_land::models::auction::{Auction, AuctionTrait};

    // Models
    use ponzi_land::models::land::{Land, LandStake, LandTrait, Level, PoolKey, PoolKeyConversion};
    use ponzi_land::store::{Store, StoreTrait};

    // Internal systems
    use ponzi_land::systems::auth::{IAuthDispatcher, IAuthDispatcherTrait};
    use ponzi_land::systems::token_registry::{
        ITokenRegistryDispatcher, ITokenRegistryDispatcherTrait,
    };

    // Utils
    use ponzi_land::utils::common_strucs::{
        ClaimInfo, LandOrAuction, LandWithTaxes, LandYieldInfo, TokenInfo, YieldInfo,
    };
    use ponzi_land::utils::get_neighbors::{get_average_price, get_land_neighbors};
    use ponzi_land::utils::level_up::calculate_new_level;
    use ponzi_land::utils::packing::{pack_neighbors_info, unpack_neighbors_info};
    use ponzi_land::utils::stake::calculate_refund_amount;
    use ponzi_land::utils::validations::{validate_owner_land_for_buy, validate_params};
    use starknet::contract_address::ContractAddressZeroable;
    use starknet::storage::{
        Map, MutableVecTrait, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
        Vec, VecTrait,
    };
    // Starknet imports
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address, get_contract_address};
    use super::{IActions, WorldStorage};


    component!(path: PayableComponent, storage: payable, event: PayableEvent);

    impl PayableInternalImpl = PayableComponent::PayableImpl<ContractState>;

    component!(path: StakeComponent, storage: stake, event: StakeEvent);
    impl StakeInternalImpl = StakeComponent::InternalImpl<ContractState>;

    component!(path: TaxesComponent, storage: taxes, event: TaxesEvent);
    impl TaxesInternalImpl = TaxesComponent::InternalImpl<ContractState>;

    component!(path: AuctionComponent, storage: auction, event: AuctionEvent);
    impl AuctionInternalImpl = AuctionComponent::InternalImpl<ContractState>;

    component!(
        path: ReentrancyGuardComponent, storage: reentrancy_guard, event: ReentrancyGuardEvent,
    );
    impl ReentrancyGuardInternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        PayableEvent: PayableComponent::Event,
        #[flat]
        StakeEvent: StakeComponent::Event,
        #[flat]
        TaxesEvent: TaxesComponent::Event,
        #[flat]
        AuctionEvent: AuctionComponent::Event,
        #[flat]
        ReentrancyGuardEvent: ReentrancyGuardComponent::Event,
    }

    // Storage
    #[storage]
    struct Storage {
        #[substorage(v0)]
        payable: PayableComponent::Storage,
        #[substorage(v0)]
        stake: StakeComponent::Storage,
        #[substorage(v0)]
        taxes: TaxesComponent::Storage,
        #[substorage(v0)]
        auction: AuctionComponent::Storage,
        #[substorage(v0)]
        reentrancy_guard: ReentrancyGuardComponent::Storage,
        ekubo_dispatcher: ICoreDispatcher,
        staked_lands: Map<u16, bool> // New storage variable to track staked lands
    }

    fn dojo_init(
        ref self: ContractState,
        start_price: u256,
        floor_price: u256,
        ekubo_core_address: ContractAddress,
        main_currency: ContractAddress,
    ) {
        self.ekubo_dispatcher.write(ICoreDispatcher { contract_address: ekubo_core_address });
        let mut world = self.world_default();
        let store = StoreTrait::new(world);
        self.auction.initialize_circle_expansion();
        self
            .auction
            .create(
                store,
                CENTER_LOCATION,
                start_price,
                floor_price,
                true, // We're technically not in a nuke context, but we're initializing the auction (and that seems to make it work)
                Option::Some(main_currency),
            );
    }


    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn buy(
            ref self: ContractState,
            land_location: u16,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
        ) {
            self.reentrancy_guard.start();

            validate_params(sell_price, amount_to_stake);
            let mut world = self.world_default();

            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            let our_contract_address = get_contract_address();

            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');
            world.token_registry_dispatcher().ensure_token_authorized(token_for_sale);

            let mut store = StoreTrait::new(world);
            let land = store.land(land_location);

            validate_owner_land_for_buy(@land, caller);

            let (seller, sold_price, token_used) = (land.owner, land.sell_price, land.token_used);
            let (claim_fee, claim_fee_threshold, our_contract_for_fee) = (
                store.get_claim_fee(),
                store.get_claim_fee_threshold(),
                store.get_our_contract_for_fee(),
            );
            let neighbors = get_land_neighbors(store, land.location);

            self
                .execute_buy_claims(
                    store,
                    @land,
                    neighbors,
                    current_time,
                    our_contract_address,
                    claim_fee,
                    claim_fee_threshold,
                    our_contract_for_fee,
                );
            self.validate_and_execute_buy_payment(land, caller, store, our_contract_for_fee);
            self.stake._refund(store, land, our_contract_address);

            self
                .finalize_land_purchase(
                    store,
                    land_location,
                    token_for_sale,
                    sell_price,
                    amount_to_stake,
                    caller,
                    neighbors,
                    current_time,
                    our_contract_address,
                    false,
                );

            store
                .world
                .emit_event(
                    @LandBoughtEvent {
                        buyer: caller, land_location: land.location, sold_price, seller, token_used,
                    },
                );
            self.reentrancy_guard.end();
        }


        fn claim(ref self: ContractState, land_location: u16) {
            self.reentrancy_guard.start();

            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);

            let caller = get_caller_address();
            let current_time = get_block_timestamp();

            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');

            let land = store.land(land_location);
            assert(land.is_owner(caller), 'not the owner');

            let neighbors = get_land_neighbors(store, land.location);
            let (claim_fee, claim_fee_threshold, our_contract_for_fee, our_contract_address) = (
                store.get_claim_fee(),
                store.get_claim_fee_threshold(),
                store.get_our_contract_for_fee(),
                get_contract_address(),
            );

            self
                .execute_claim(
                    store,
                    @land,
                    neighbors,
                    current_time,
                    our_contract_address,
                    false,
                    claim_fee,
                    claim_fee_threshold,
                    our_contract_for_fee,
                );

            self.reentrancy_guard.end();
        }

        fn claim_all(ref self: ContractState, land_locations: Array<u16>) {
            self.reentrancy_guard.start();
            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);

            let caller = get_caller_address();
            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');

            let current_time = get_block_timestamp();

            let (claim_fee, claim_fee_threshold, our_contract_for_fee, our_contract_address) = (
                store.get_claim_fee(),
                store.get_claim_fee_threshold(),
                store.get_our_contract_for_fee(),
                get_contract_address(),
            );

            for land_location in land_locations {
                if !self.auction.is_auction_active(land_location) {
                    let land = store.land(land_location);
                    if !land.is_owner(caller) {
                        continue;
                    }
                    let neighbors = get_land_neighbors(store, land_location);
                    self
                        .execute_claim(
                            store,
                            @land,
                            neighbors,
                            current_time,
                            our_contract_address,
                            false,
                            claim_fee,
                            claim_fee_threshold,
                            our_contract_for_fee,
                        );
                }
            }
            self.reentrancy_guard.end();
        }

        fn bid(
            ref self: ContractState,
            land_location: u16,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
        ) {
            self.reentrancy_guard.start();
            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);

            let caller = get_caller_address();
            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');

            let current_time = get_block_timestamp();
            let our_contract_address = get_contract_address();
            let mut land = store.land(land_location);
            assert(!land.has_owner(), 'must be without owner');
            validate_params(sell_price, amount_to_stake);

            // Validate that the token is authorized to be used
            world.token_registry_dispatcher().ensure_token_authorized(token_for_sale);

            //auction part
            //Validate if the land can be buyed because is an auction happening for that land
            let mut auction = store.auction(land_location);
            assert(self.auction.is_auction_active(land_location), 'auction not started');
            let current_price = auction.get_current_price_decay_rate(store);
            let neighbors = get_land_neighbors(store, land_location);

            self
                .execute_bid_purchase(
                    store,
                    land,
                    token_for_sale,
                    sell_price,
                    current_price,
                    amount_to_stake,
                    caller,
                    auction,
                    neighbors,
                    current_time,
                    current_price,
                    our_contract_address,
                );

            self.reentrancy_guard.end();
        }

        fn recreate_auction(ref self: ContractState, land_location: u16) {
            let caller = get_caller_address();
            let mut world = self.world_default();
            assert(world.auth_dispatcher().is_owner_auth(caller), 'action not permitted');

            let mut store = StoreTrait::new(world);
            let mut land = store.land(land_location);
            let mut land_stake = store.land_stake(land_location);
            assert(land.owner == ContractAddressZeroable::zero(), 'land must be without owner');
            store.delete_land(land, land_stake);
            let sell_price = get_suggested_sell_price(store, land_location);
            self
                .auction
                .create(
                    store, land_location, sell_price, store.get_floor_price(), true, Option::None,
                );
        }


        fn increase_price(ref self: ContractState, land_location: u16, new_price: u256) {
            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);

            let caller = get_caller_address();
            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');

            let mut land = store.land(land_location);

            assert(land.is_owner(caller), 'not the owner');
            assert(new_price > land.sell_price, 'new_price != land.sell_price');

            land.sell_price = new_price;
            store.set_land(land);
        }

        fn increase_stake(ref self: ContractState, land_location: u16, amount_to_stake: u256) {
            self.reentrancy_guard.start();

            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);

            let caller = get_caller_address();
            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');

            let land = store.land(land_location);
            assert(land.is_owner(caller), 'not the owner');
            assert(amount_to_stake > 0, 'amount has to be > 0');

            let mut land_stake = store.land_stake(land.location);
            self
                .stake
                ._add(
                    amount_to_stake,
                    caller,
                    land.token_used,
                    land_stake,
                    store,
                    get_contract_address(),
                );

            let new_stake_amount = land_stake.amount + amount_to_stake;
            store
                .world
                .emit_event(@AddStakeEvent { land_location, new_stake_amount, owner: caller });

            self.reentrancy_guard.end();
        }

        fn level_up(ref self: ContractState, land_location: u16) -> bool {
            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);

            let caller = get_caller_address();
            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');

            let mut land = store.land(land_location);
            assert(land.is_owner(caller), 'not the owner');

            let current_time = get_block_timestamp();
            let elapsed_time_since_buy = (current_time - land.block_date_bought)
                * store.get_time_speed().into();

            self.update_level(ref store, ref land, elapsed_time_since_buy)
        }

        fn reimburse_stakes(ref self: ContractState) {
            self.reentrancy_guard.start();
            let mut world = self.world_default();
            let caller = get_caller_address();
            assert(world.auth_dispatcher().is_owner_auth(caller), 'not the owner');

            let mut store = StoreTrait::new(world);
            let mut active_lands: Array<Land> = ArrayTrait::new();
            let grid_width: u16 = MAX_GRID_SIZE.into();
            let mut i: u16 = 0;
            loop {
                if i >= grid_width * grid_width {
                    break;
                }
                if self.staked_lands.read(i) {
                    let land = store.land(i);
                    let land_stake = store.land_stake(i);
                    if !land.owner.is_zero() && land_stake.amount > 0 {
                        active_lands.append(land);
                    }
                }
                i += 1;
            }
            self.stake._reimburse(store, active_lands.span());
            self.reentrancy_guard.end();
        }


        //GETTERS FUNCTIONS

        fn get_land(self: @ContractState, land_location: u16) -> (Land, LandStake) {
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            let land = store.land(land_location);
            let land_stake = store.land_stake(land_location);
            (land, land_stake)
        }


        fn get_current_auction_price(self: @ContractState, land_location: u16) -> u256 {
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            let auction = store.auction(land_location);
            if auction.is_finished {
                return 0;
            }
            auction.get_current_price_decay_rate(store)
        }

        fn get_next_claim_info(self: @ContractState, land_location: u16) -> Array<ClaimInfo> {
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            let land = store.land(land_location);
            let current_time = get_block_timestamp();
            let neighbors = get_land_neighbors(store, land.location);
            let mut claim_info: Array<ClaimInfo> = ArrayTrait::new();

            if neighbors.len() > 0 {
                for neighbor in neighbors {
                    let neighbor_location = *neighbor.location;
                    let land_stake = store.land_stake(neighbor_location);
                    if land_stake.amount > 0 {
                        let tax_per_neighbor = self
                            .get_unclaimed_taxes_per_neighbor(neighbor_location, land_location);

                        let time_to_nuke = self.get_time_to_nuke(neighbor_location);

                        let claim_info_per_neighbor = ClaimInfo {
                            token_address: *neighbor.token_used,
                            amount: tax_per_neighbor,
                            land_location: neighbor_location,
                            can_be_nuked: time_to_nuke == current_time,
                        };
                        claim_info.append(claim_info_per_neighbor);
                    }
                }
            }
            claim_info
        }

        fn get_elapsed_time_since_last_claim(
            self: @ContractState, claimer_location: u16, payer_location: u16,
        ) -> u64 {
            let current_time = get_block_timestamp();
            let elapsed_time = self
                .taxes
                .get_elapsed_time_since_last_claim(claimer_location, payer_location, current_time);
            elapsed_time
        }

        fn get_elapsed_time_since_last_claim_for_neighbors(
            self: @ContractState, payer_location: u16,
        ) -> Array<(u16, u64)> {
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            let current_time = get_block_timestamp();
            let neighbors = get_land_neighbors(store, payer_location);
            let mut elapsed_time: Array<(u16, u64)> = ArrayTrait::new();
            for neighbor in neighbors {
                let neighbor_location = *neighbor.location;
                elapsed_time
                    .append(
                        (
                            neighbor_location,
                            self
                                .taxes
                                .get_elapsed_time_since_last_claim(
                                    neighbor_location, payer_location, current_time,
                                ),
                        ),
                    );
            }
            elapsed_time
        }


        fn get_neighbors_yield(self: @ContractState, land_location: u16) -> LandYieldInfo {
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            let land = store.land(land_location);
            let neighbors = get_land_neighbors(store, land.location);
            let neighbors_count = neighbors.len();

            let mut yield_info: Array<YieldInfo> = ArrayTrait::new();
            if neighbors_count > 0 {
                for neighbor in neighbors {
                    let neighbor_location = *neighbor.location;
                    let land_stake = store.land_stake(neighbor_location);
                    if land_stake.amount > 0 {
                        let token = *neighbor.token_used;
                        let rate = store.get_tax_rate().into() * store.get_time_speed().into() / 8;
                        let rate_per_hour = get_tax_rate_per_neighbor(neighbor, store);
                        yield_info
                            .append(
                                YieldInfo {
                                    token,
                                    sell_price: *neighbor.sell_price,
                                    percent_rate: rate,
                                    per_hour: rate_per_hour,
                                    location: neighbor_location,
                                },
                            );
                    }
                }
            }

            let time_to_nuke = self.get_time_to_nuke(land.location);
            LandYieldInfo { yield_info, remaining_stake_time: time_to_nuke.into() }
        }


        fn get_active_auctions(self: @ContractState) -> u8 {
            self.auction.get_active_auctions_count()
        }

        fn get_auction(self: @ContractState, land_location: u16) -> Auction {
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            store.auction(land_location)
        }

        fn get_time_to_nuke(self: @ContractState, land_location: u16) -> u64 {
            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);
            let land = store.land(land_location);
            let land_stake = store.land_stake(land_location);
            let neighbors = get_land_neighbors(store, land.location);
            self.taxes.calculate_nuke_time(store, @land, @land_stake, neighbors)
        }

        fn get_unclaimed_taxes_per_neighbor(
            self: @ContractState, claimer_location: u16, payer_location: u16,
        ) -> u256 {
            let world = self.world_default();
            let store = StoreTrait::new(world);
            let payer_land = store.land(payer_location);
            let elapsed_time = self
                .get_elapsed_time_since_last_claim(claimer_location, payer_location);
            get_taxes_per_neighbor(@payer_land, elapsed_time, store)
        }

        fn get_unclaimed_taxes_per_neighbors_total(
            self: @ContractState, land_location: u16,
        ) -> u256 {
            let world = self.world_default();
            let store = StoreTrait::new(world);
            let land = store.land(land_location);
            let neighbors = get_land_neighbors(store, land.location);
            let mut total = 0;
            for neighbor in neighbors {
                total += self.get_unclaimed_taxes_per_neighbor(*neighbor.location, land_location);
            }
            total
        }


        fn get_game_speed(self: @ContractState) -> u64 {
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            store.get_time_speed().into()
        }

        fn get_neighbors(self: @ContractState, land_location: u16) -> Array<LandOrAuction> {
            let mut world = self.world_default();
            let neighbors = get_all_neighbors(land_location);

            let mut neighbors_array = ArrayTrait::new();

            for neighbor in neighbors {
                let maybe_auction: Auction = world.read_model(neighbor);
                let maybe_land: Land = world.read_model(neighbor);

                if maybe_auction.floor_price != 0 && maybe_auction.is_finished == false {
                    neighbors_array.append(LandOrAuction::Auction(maybe_auction));
                } else if maybe_land.sell_price != 0 {
                    neighbors_array.append(LandOrAuction::Land(maybe_land));
                } else {
                    neighbors_array.append(LandOrAuction::None);
                }
            }

            neighbors_array
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"ponzi_land")
        }

        fn nuke(
            ref self: ContractState,
            mut store: Store,
            mut land: Land,
            ref land_stake: LandStake,
            mut land_stake_before_claim: u256,
            has_liquidity_requirements: bool,
            current_time: u64,
            our_contract_address: ContractAddress,
            claim_fee: u128,
            claim_fee_threshold: u128,
            our_contract_for_fee: ContractAddress,
        ) {
            let neighbors = get_land_neighbors(store, land.location);

            if !has_liquidity_requirements && land_stake.amount >= 0 {
                self.stake._refund(store, land, our_contract_address);
                land_stake = store.land_stake(land.location);
                land_stake_before_claim = land_stake.amount;
            }

            assert(land_stake.amount == 0, 'land not valid to nuke');
            //Last claim for nuked land
            for neighbor in neighbors {
                let mut neighbor_stake = store.land_stake(*neighbor.location);
                let neighbor_stake_before_claim = neighbor_stake.amount;
                if *neighbor.owner != ContractAddressZeroable::zero()
                    && neighbor_stake.amount > 0
                    && *neighbor.location != land.location {
                    let is_dead = self
                        .taxes
                        .claim(
                            store,
                            @land,
                            neighbor,
                            ref neighbor_stake,
                            current_time,
                            our_contract_address,
                            claim_fee,
                            claim_fee_threshold,
                            our_contract_for_fee,
                            true,
                        );

                    // Handle dead land detection - when a land becomes isolated with zero stake
                    if is_dead {
                        self
                            ._delete_land_and_create_auction(
                                store, *neighbor, neighbor_stake, neighbor_stake_before_claim,
                            );
                    }
                }
            }

            // Reuse common deletion and auction creation logic
            self._delete_land_and_create_auction(store, land, land_stake, land_stake_before_claim);
            // Update neighbor info after deleting the land
            update_neighbors_after_delete(store, neighbors);
        }

        fn _delete_land_and_create_auction(
            ref self: ContractState,
            mut store: Store,
            land: Land,
            land_stake: LandStake,
            land_stake_before_claim: u256,
        ) {
            let owner_nuked = land.owner;
            store.delete_land(land, land_stake);

            if land_stake_before_claim > 0 {
                let token_info = TokenInfo {
                    token_address: land.token_used, amount: land_stake_before_claim,
                };
                self.stake._discount_stake_for_nuke(token_info);
            }

            self.staked_lands.write(land.location, false);

            store.world.emit_event(@LandNukedEvent { owner_nuked, land_location: land.location });

            let sell_price = get_suggested_sell_price(store, land.location);
            self
                .auction
                .create(
                    store, land.location, sell_price, store.get_floor_price(), true, Option::None,
                );
        }

        fn execute_claim(
            ref self: ContractState,
            mut store: Store,
            claimer_land: @Land,
            neighbors: Span<Land>,
            current_time: u64,
            our_contract_address: ContractAddress,
            from_buy: bool,
            claim_fee: u128,
            claim_fee_threshold: u128,
            our_contract_for_fee: ContractAddress,
        ) {
            if neighbors.len() != 0 {
                for mut tax_payer in neighbors {
                    let mut tax_payer_stake = store.land_stake(*tax_payer.location);
                    let tax_payer_stake_before_claim = tax_payer_stake.amount;
                    let is_nuke = self
                        .taxes
                        .claim(
                            store,
                            claimer_land,
                            tax_payer,
                            ref tax_payer_stake,
                            current_time,
                            our_contract_address,
                            claim_fee,
                            claim_fee_threshold,
                            our_contract_for_fee,
                            false,
                        );

                    let has_liquidity_requirements = self
                        .world_default()
                        .token_registry_dispatcher()
                        .is_token_authorized(*tax_payer.token_used);

                    if (is_nuke || !has_liquidity_requirements) && !from_buy {
                        self
                            .nuke(
                                store,
                                *tax_payer,
                                ref tax_payer_stake,
                                tax_payer_stake_before_claim,
                                has_liquidity_requirements,
                                current_time,
                                our_contract_address,
                                claim_fee,
                                claim_fee_threshold,
                                our_contract_for_fee,
                            );
                    }
                };
            }
        }

        fn execute_bid_purchase(
            ref self: ContractState,
            mut store: Store,
            mut land: Land,
            token_for_sale: ContractAddress,
            sell_price: u256,
            sold_at_price: u256,
            amount_to_stake: u256,
            caller: ContractAddress,
            mut auction: Auction,
            neighbors: Span<Land>,
            current_time: u64,
            current_price: u256,
            our_contract_address: ContractAddress,
        ) {
            self
                .payable
                .validate_and_execute_bid_payment(
                    land.token_used, caller, store.get_our_contract_for_auction(), sold_at_price,
                );

            self
                .finalize_land_purchase(
                    store,
                    land.location,
                    token_for_sale,
                    sell_price,
                    amount_to_stake,
                    caller,
                    neighbors,
                    current_time,
                    our_contract_address,
                    true,
                );

            //update neighbors_info_packed with the new land for the existing neighbors
            update_neighbors_info(store, neighbors, land.location, current_time);
            self.staked_lands.write(land.location, true);

            self.auction.finish_auction(store, auction, caller, current_price);

            // Generate new auctions if space available
            let active_auctions = self.auction.get_active_auctions_count();
            if active_auctions < store.get_max_auctions() {
                self.auction.generate_new_auctions(sold_at_price, store);
            }
        }
        fn finalize_land_purchase(
            ref self: ContractState,
            mut store: Store,
            land_location: u16,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
            caller: ContractAddress,
            neighbors: Span<Land>,
            current_time: u64,
            our_contract_address: ContractAddress,
            is_from_bid: bool,
        ) {
            let land = LandTrait::new(
                land_location, caller, token_for_sale, sell_price, current_time,
            );
            store.set_land(land);

            let mut land_stake = store.land_stake(land.location);

            //initialize neighbors_info_packed for the future claims
            let neighbors_info = pack_neighbors_info(
                current_time, neighbors.len().try_into().unwrap(), land.location,
            );
            land_stake.neighbors_info_packed = neighbors_info;

            self
                .stake
                ._add(
                    amount_to_stake,
                    caller,
                    token_for_sale,
                    land_stake,
                    store,
                    our_contract_address,
                );

            for neighbor in neighbors {
                let neighbor_location = *neighbor.location;
                self
                    .taxes
                    .register_bidirectional_tax_relations(
                        land_location, neighbor_location, current_time,
                    );
            }
        }


        fn execute_buy_claims(
            ref self: ContractState,
            mut store: Store,
            land: @Land,
            neighbors: Span<Land>,
            current_time: u64,
            our_contract_address: ContractAddress,
            claim_fee: u128,
            claim_fee_threshold: u128,
            our_contract_for_fee: ContractAddress,
        ) {
            //last claim for the seller
            self
                .execute_claim(
                    store,
                    land,
                    neighbors,
                    current_time,
                    our_contract_address,
                    false,
                    claim_fee,
                    claim_fee_threshold,
                    our_contract_for_fee,
                );

            //last claim pay from the seller to the neighbors
            let land_seller: Span<Land> = array![*land].span();
            for claimer_neighbor in neighbors {
                self
                    .execute_claim(
                        store,
                        claimer_neighbor,
                        land_seller,
                        current_time,
                        our_contract_address,
                        true,
                        claim_fee,
                        claim_fee_threshold,
                        our_contract_for_fee,
                    );
            }
        }

        fn validate_and_execute_buy_payment(
            ref self: ContractState,
            land: Land,
            caller: ContractAddress,
            store: Store,
            our_contract_for_fee: ContractAddress,
        ) {
            let validation_result = self.payable.validate(land.token_used, caller, land.sell_price);
            assert(validation_result.status, ERC20_VALIDATE_AMOUNT_BUY);

            let buy_fee = store.get_buy_fee();
            self
                .payable
                .proccess_payment_with_fee_for_buy(
                    caller, land.owner, buy_fee, our_contract_for_fee, validation_result,
                );
        }

        fn update_level(
            self: @ContractState, ref store: Store, ref land: Land, elapsed_time: u64,
        ) -> bool {
            let new_level = calculate_new_level(elapsed_time);

            if land.level != new_level {
                land.level = new_level;
                store.set_land(land);
                true
            } else {
                false
            }
        }

        fn check_liquidity_pool_requirements(
            self: @ContractState,
            store: Store,
            sell_token: ContractAddress,
            sell_price: u256,
            pool_key: PoolKey,
        ) -> bool {
            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);
            let main_currency = store.get_main_currency();
            // We need to validate that the poolkey:
            // - Is valid (token0 < token1)
            // - Contains main_currency in one of its two tokens
            // - Contains sell_token in one of its two tokens

            let token0 = pool_key.token0;
            let token1 = pool_key.token1;

            if token0 != main_currency && token1 != main_currency {
                return false;
            }

            if token0 != sell_token && token1 != sell_token {
                return false;
            }

            if token0 == token1 {
                // We cannot create a liquidity pool between the same tokens,
                // so we always accept it
                return true;
            }

            let liquidity_pool: u128 = self
                .ekubo_dispatcher
                .read()
                .get_pool_liquidity(PoolKeyConversion::to_ekubo(pool_key));
            return (sell_price * store.get_liquidity_safety_multiplier().into()) < liquidity_pool
                .into();
        }
    }
}
