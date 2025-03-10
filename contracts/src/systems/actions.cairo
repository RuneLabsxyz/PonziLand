use starknet::ContractAddress;

use dojo::world::WorldStorage;
use ponzi_land::models::land::{Land, PoolKey};
use ponzi_land::models::auction::Auction;
use ponzi_land::utils::common_strucs::{TokenInfo, ClaimInfo, LandYieldInfo};

// define the interface
#[starknet::interface]
trait IActions<T> {
    //TODO:PASS THIS FUNCTION TO INTERNAL IMPL AFTER TESTS
    fn auction(
        ref self: T,
        land_location: u64,
        start_price: u256,
        floor_price: u256,
        decay_rate: u64,
        is_from_nuke: bool,
    );

    fn bid(
        ref self: T,
        land_location: u64,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
        liquidity_pool: PoolKey,
    );
    fn buy(
        ref self: T,
        land_location: u64,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
        liquidity_pool: PoolKey,
    );

    fn claim(ref self: T, land_location: u64);

    fn claim_all(ref self: T, land_locations: Array<u64>);

    fn nuke(ref self: T, land_location: u64);

    fn increase_price(ref self: T, land_location: u64, new_price: u256);

    fn increase_stake(ref self: T, land_location: u64, amount_to_stake: u256);

    fn level_up(ref self: T, land_location: u64) -> bool;

    fn reimburse_stakes(ref self: T,);

    fn get_land(self: @T, land_location: u64) -> Land;
    fn get_pending_taxes_for_land(
        self: @T, land_location: u64, owner_land: ContractAddress,
    ) -> Array<TokenInfo>;
    fn get_current_auction_price(self: @T, land_location: u64) -> u256;
    fn get_next_claim_info(self: @T, land_location: u64) -> Array<ClaimInfo>;
    fn get_neighbors_yield(self: @T, land_location: u64) -> LandYieldInfo;
    fn get_active_auctions(self: @T) -> u8;
    fn get_auction(self: @T, land_location: u64) -> Auction;
}

// dojo decorator
#[dojo::contract]
pub mod actions {
    use super::{IActions, WorldStorage};

    use core::nullable::{Nullable, NullableTrait, match_nullable, FromNullableResult};
    use core::dict::{Felt252Dict, Felt252DictTrait, Felt252DictEntryTrait};

    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::contract_address::ContractAddressZeroable;
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry
    };
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::event::EventStorage;
    use ekubo::interfaces::core::{ICoreDispatcher, ICoreDispatcherTrait};

    use ponzi_land::systems::auth::{IAuthDispatcher, IAuthDispatcherTrait};

    use ponzi_land::models::land::{Land, LandTrait, Level, PoolKeyConversion, PoolKey};
    use ponzi_land::models::auction::{Auction, AuctionTrait};

    use ponzi_land::components::stake::StakeComponent;
    use ponzi_land::components::taxes::TaxesComponent;
    use ponzi_land::components::payable::PayableComponent;

    use ponzi_land::utils::common_strucs::{
        TokenInfo, ClaimInfo, YieldInfo, LandYieldInfo, LandWithTaxes
    };
    use ponzi_land::utils::get_neighbors::{get_land_neighbors, get_average_price};
    use ponzi_land::utils::spiral::{get_next_position, SpiralState,};
    use ponzi_land::utils::level_up::{calculate_new_level};
    use ponzi_land::utils::stake::{calculate_refund_amount};

    use ponzi_land::helpers::coord::{
        is_valid_position, up, down, left, right, max_neighbors, index_to_position,
        position_to_index, up_left, up_right, down_left, down_right
    };

    use ponzi_land::consts::{
        TAX_RATE, BASE_TIME, TIME_SPEED, MAX_AUCTIONS, DECAY_RATE, FLOOR_PRICE,
        LIQUIDITY_SAFETY_MULTIPLIER, MIN_AUCTION_PRICE, GRID_WIDTH
    };
    use ponzi_land::store::{Store, StoreTrait};
    use ponzi_land::interfaces::systems::{SystemsTrait};


    component!(path: PayableComponent, storage: payable, event: PayableEvent);
    impl PayableInternalImpl = PayableComponent::PayableImpl<ContractState>;

    component!(path: StakeComponent, storage: stake, event: StakeEvent);
    impl StakeInternalImpl = StakeComponent::InternalImpl<ContractState>;

    component!(path: TaxesComponent, storage: taxes, event: TaxesEvent);
    impl TaxesInternalImpl = TaxesComponent::InternalImpl<ContractState>;

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        PayableEvent: PayableComponent::Event,
        #[flat]
        StakeEvent: StakeComponent::Event,
        #[flat]
        TaxesEvent: TaxesComponent::Event
    }

    //events

    #[derive(Drop, Serde)]
    #[dojo::event]
    pub struct LandNukedEvent {
        #[key]
        owner_nuked: ContractAddress,
        land_location: u64,
    }


    #[derive(Drop, Serde)]
    #[dojo::event]
    pub struct LandBoughtEvent {
        #[key]
        buyer: ContractAddress,
        #[key]
        land_location: u64,
        sold_price: u256,
        seller: ContractAddress,
        token_used: ContractAddress,
    }

    #[derive(Drop, Serde)]
    #[dojo::event]
    pub struct RemainingStakeEvent {
        #[key]
        land_location: u64,
        remaining_stake: u256,
    }

    #[derive(Drop, Serde)]
    #[dojo::event]
    pub struct NewAuctionEvent {
        #[key]
        land_location: u64,
        start_time: u64,
        start_price: u256,
        floor_price: u256,
    }

    #[derive(Drop, Serde)]
    #[dojo::event]
    pub struct AuctionFinishedEvent {
        #[key]
        land_location: u64,
        buyer: ContractAddress,
        start_time: u64,
        final_time: u64,
        final_price: u256,
    }

    mod errors {
        const ERC20_PAY_FOR_BUY_FAILED: felt252 = 'ERC20: pay for buy failed';
        const ERC20_PAY_FOR_BID_FAILED: felt252 = 'ERC20: pay for bid failed';
        const ERC20_VALIDATE_AMOUNT_BUY: felt252 = 'validate amount for buy failed';
        const ERC20_VALIDATE_AMOUNT_BID: felt252 = 'validate amount for bid failed';
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
        active_auctions: u8,
        main_currency: ContractAddress,
        ekubo_dispatcher: ICoreDispatcher,
        heads: Map<u8, u64>,
        spiral_states: SpiralState,
        active_auction_queue: Map<u64, bool>
    }

    fn dojo_init(
        ref self: ContractState,
        token_address: ContractAddress,
        land_1: u64,
        land_2: u64,
        land_3: u64,
        land_4: u64,
        start_price: u256,
        floor_price: u256,
        decay_rate: u64,
        ekubo_core_address: ContractAddress,
    ) {
        self.main_currency.write(token_address);
        self.ekubo_dispatcher.write(ICoreDispatcher { contract_address: ekubo_core_address });

        let lands: Array<u64> = array![land_1, land_2, land_3, land_4];
        let mut i = 0;
        for land_location in lands {
            self.auction(land_location, start_price, floor_price, decay_rate, false);
            self.initialize_heads(i, land_location);
            i += 1;
        };
    }


    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn buy(
            ref self: ContractState,
            land_location: u64,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
            liquidity_pool: PoolKey,
        ) {
            assert(is_valid_position(land_location), 'Land location not valid');
            assert(sell_price > 0, 'sell_price > 0');
            assert(amount_to_stake > 0, 'amount_to_stake > 0');

            let mut world = self.world_default();
            let caller = get_caller_address();

            assert(
                world.auth_dispatcher().can_take_action(get_caller_address()),
                'action not permitted'
            );

            let mut store = StoreTrait::new(world);
            let land = store.land(land_location);

            assert(caller != land.owner, 'you already own this land');
            assert(land.owner != ContractAddressZeroable::zero(), 'must have a owner');
            assert(
                self.check_liquidity_pool_requirements(token_for_sale, sell_price, liquidity_pool),
                'Invalid liquidity_pool in buy'
            );

            let seller = land.owner;
            let sold_price = land.sell_price;
            let token_used = land.token_used;

            self.internal_claim(store, land);

            let validation_result = self.payable.validate(land.token_used, caller, land.sell_price);
            assert(validation_result.status, errors::ERC20_VALIDATE_AMOUNT_BUY);

            let transfer_status = self.payable.transfer_from(caller, land.owner, validation_result);
            assert(transfer_status, errors::ERC20_PAY_FOR_BUY_FAILED);

            self.stake._refund(store, land);

            self
                .finalize_land_purchase(
                    store,
                    land_location,
                    token_for_sale,
                    sell_price,
                    amount_to_stake,
                    liquidity_pool,
                    caller,
                );

            store
                .world
                .emit_event(
                    @LandBoughtEvent {
                        buyer: caller, land_location: land.location, sold_price, seller, token_used,
                    },
                );
        }


        fn claim(ref self: ContractState, land_location: u64) {
            assert(is_valid_position(land_location), 'Land location not valid');
            let caller = get_caller_address();
            let mut world = self.world_default();
            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');
            let mut store = StoreTrait::new(world);

            let land = store.land(land_location);
            assert(land.owner == caller, 'not the owner');

            self.internal_claim(store, land);
        }

        fn claim_all(ref self: ContractState, land_locations: Array<u64>) {
            let caller = get_caller_address();
            let mut world = self.world_default();
            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');
            let mut store = StoreTrait::new(world);

            for land_location in land_locations {
                if !self.active_auction_queue.read(land_location) {
                    assert(is_valid_position(land_location), 'Land location not valid');
                    let land = store.land(land_location);
                    assert(land.owner == caller, 'not the owner');
                    self.internal_claim(store, land);
                }
            };
        }

        // TODO:see if we want pass this function into internalTrait
        fn nuke(ref self: ContractState, land_location: u64) {
            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);
            let mut land = store.land(land_location);

            //TODO:see how we validate the lp to nuke the land
            assert(land.stake_amount == 0, 'land with stake inside nuke');
            let pending_taxes = self.get_pending_taxes_for_land(land.location, land.owner);
            if pending_taxes.len() != 0 {
                self.taxes._claim(pending_taxes, land.owner, land.location);
            }

            let owner_nuked = land.owner;
            store.delete_land(land);

            world.emit_event(@LandNukedEvent { owner_nuked, land_location });

            let sell_price = get_average_price(store, land_location);
            self.auction(land_location, sell_price, FLOOR_PRICE, DECAY_RATE * 2, true);
        }

        fn bid(
            ref self: ContractState,
            land_location: u64,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
            liquidity_pool: PoolKey,
        ) {
            let mut world = self.world_default();

            let caller = get_caller_address();
            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');

            let mut store = StoreTrait::new(world);

            let mut land = store.land(land_location);

            assert(
                self.check_liquidity_pool_requirements(token_for_sale, sell_price, liquidity_pool),
                'Invalid liquidity_pool in bid'
            );
            assert(is_valid_position(land_location), 'Land location not valid');
            assert(land.owner == ContractAddressZeroable::zero(), 'must be without owner');
            assert(sell_price > 0, 'sell_price > 0');
            assert(amount_to_stake > 0, 'amount_to_stake > 0');

            //auction part

            //Validate if the land can be buyed because is an auction happening for that land
            let mut auction = store.auction(land_location);
            assert(self.active_auction_queue.read(land_location), 'auction not started');

            let current_price = auction.get_current_price_decay_rate();
            land.sell_price = sell_price;
            store.set_land(land);

            self.internal_claim(store, land);

            self
                .buy_from_bid(
                    store,
                    land,
                    token_for_sale,
                    sell_price,
                    current_price,
                    amount_to_stake,
                    liquidity_pool,
                    caller,
                    auction,
                );
        }

        fn auction(
            ref self: ContractState,
            land_location: u64,
            start_price: u256,
            floor_price: u256,
            decay_rate: u64,
            is_from_nuke: bool,
        ) {
            assert(is_valid_position(land_location), 'Land location not valid');
            assert(start_price > 0, 'start_price > 0');
            assert(floor_price > 0, 'floor_price > 0');
            //we don't want generate an error if the auction is full
            if (!is_from_nuke && self.active_auctions.read() >= MAX_AUCTIONS) {
                return;
            }
            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);
            let mut land = store.land(land_location);

            assert(land.owner == ContractAddressZeroable::zero(), 'must be without owner');

            let auction = AuctionTrait::new(
                land_location, start_price, floor_price, false, decay_rate,
            );

            store.set_auction(auction);
            self.active_auctions.write(self.active_auctions.read() + 1);
            self.active_auction_queue.write(land_location, true);
            land.sell_price = start_price;
            // land.token_used = LORDS_CURRENCY;
            land.token_used = self.main_currency.read();

            store.set_land(land);

            store
                .world
                .emit_event(
                    @NewAuctionEvent {
                        land_location, start_time: auction.start_time, start_price, floor_price,
                    },
                );
        }


        fn increase_price(ref self: ContractState, land_location: u64, new_price: u256) {
            assert(is_valid_position(land_location), 'Land location not valid');

            let mut world = self.world_default();
            let caller = get_caller_address();

            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');

            let mut store = StoreTrait::new(world);

            let mut land = store.land(land_location);

            assert(land.owner == caller, 'not the owner');
            assert(new_price > land.sell_price, 'new_price != land.sell_price');

            land.sell_price = new_price;
            store.set_land(land);
        }

        fn increase_stake(ref self: ContractState, land_location: u64, amount_to_stake: u256) {
            assert(is_valid_position(land_location), 'Land location not valid');

            let mut world = self.world_default();
            let caller = get_caller_address();

            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');

            let mut store = StoreTrait::new(world);

            let mut land = store.land(land_location);

            assert(land.owner == caller, 'not the owner');
            self.stake._add(amount_to_stake, land, store);

            // Could be removed now that the remaining stake is stored in the world contrect
            // #52 issue
            store
                .world
                .emit_event(
                    @RemainingStakeEvent {
                        land_location: land.location, remaining_stake: land.stake_amount,
                    },
                );
        }

        fn level_up(ref self: ContractState, land_location: u64) -> bool {
            assert(is_valid_position(land_location), 'Land location not valid');

            let mut world = self.world_default();

            let caller = get_caller_address();
            assert(world.auth_dispatcher().can_take_action(caller), 'action not permitted');

            let mut store = StoreTrait::new(world);
            let mut land = store.land(land_location);

            assert(land.owner == caller, 'not the owner');

            let current_time = get_block_timestamp();
            let elapsed_time_since_buy = (current_time - land.block_date_bought)
                * TIME_SPEED.into();

            self.update_level(ref store, ref land, elapsed_time_since_buy)
        }

        fn reimburse_stakes(ref self: ContractState) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');

            let mut store = StoreTrait::new(world);
            let mut active_lands_with_taxes: Array<LandWithTaxes> = ArrayTrait::new();

            for i in 0
                ..GRID_WIDTH
                    * GRID_WIDTH {
                        let land = store.land(i);
                        if !land.owner.is_zero() && land.stake_amount > 0 {
                            let taxes = self.get_pending_taxes_for_land(land.location, land.owner);
                            active_lands_with_taxes
                                .append(
                                    LandWithTaxes {
                                        land,
                                        taxes: if taxes.len() != 0 {
                                            Option::Some(taxes)
                                        } else {
                                            Option::None
                                        },
                                    }
                                )
                        }
                    };

            let mut token_ratios = self
                .stake
                .reimburse_and_return_ratios(store, active_lands_with_taxes.span());

            self.distribute_adjusted_taxes(active_lands_with_taxes, token_ratios);
        }


        //GETTERS FUNCTIONS

        fn get_pending_taxes_for_land(
            self: @ContractState, land_location: u64, owner_land: ContractAddress,
        ) -> Array<TokenInfo> {
            self.taxes._get_pending_taxes(owner_land, land_location)
        }

        fn get_land(self: @ContractState, land_location: u64) -> Land {
            assert(is_valid_position(land_location), 'Land location not valid');
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            let land = store.land(land_location);
            land
        }


        fn get_current_auction_price(self: @ContractState, land_location: u64) -> u256 {
            assert(is_valid_position(land_location), 'Land location not valid');
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            let auction = store.auction(land_location);

            if auction.is_finished {
                return 0;
            }
            auction.get_current_price_decay_rate()
        }

        fn get_next_claim_info(self: @ContractState, land_location: u64) -> Array<ClaimInfo> {
            assert(is_valid_position(land_location), 'Land location not valid');
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            let land = store.land(land_location);

            let neighbors = get_land_neighbors(store, land.location);
            let mut claim_info: Array<ClaimInfo> = ArrayTrait::new();

            //TODO:see if we pass this to utils
            if neighbors.len() > 0 {
                for neighbor in neighbors {
                    let current_time = get_block_timestamp();
                    let elapsed_time = (current_time - neighbor.last_pay_time) * TIME_SPEED.into();

                    let total_taxes: u256 = (neighbor.sell_price
                        * TAX_RATE.into()
                        * elapsed_time.into())
                        / (100 * BASE_TIME.into());

                    let (tax_to_distribute, is_nuke) = if neighbor.stake_amount <= total_taxes {
                        (neighbor.stake_amount, true)
                    } else {
                        (total_taxes, false)
                    };

                    let tax_per_neighbor = tax_to_distribute
                        / max_neighbors(neighbor.location).into();
                    let claim_info_per_neighbor = ClaimInfo {
                        token_address: neighbor.token_used,
                        amount: tax_per_neighbor,
                        land_location: neighbor.location,
                        can_be_nuked: is_nuke,
                    };
                    claim_info.append(claim_info_per_neighbor);
                }
            }
            claim_info
        }


        fn get_neighbors_yield(self: @ContractState, land_location: u64) -> LandYieldInfo {
            assert(is_valid_position(land_location), 'Land location not valid');
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            let land = store.land(land_location);

            let neighbors = get_land_neighbors(store, land.location);
            let neighbors_count = neighbors.len();

            let mut yield_info: Array<YieldInfo> = ArrayTrait::new();
            if neighbors_count > 0 {
                for neighbor in neighbors {
                    let token = neighbor.token_used;
                    let rate = TAX_RATE.into() * TIME_SPEED.into() / 8;
                    let rate_per_hour = rate * neighbor.sell_price / 100;

                    yield_info
                        .append(
                            YieldInfo {
                                token,
                                sell_price: neighbor.sell_price,
                                percent_rate: rate,
                                per_hour: rate_per_hour,
                                location: neighbor.location,
                            },
                        );
                }
            }

            // Calculate the remaining time the stake may sustain.

            let remaining_stake_time: u256 = if neighbors_count > 0 {
                let per_hour_expenses_percent_per_neighbour = TAX_RATE.into()
                    * TIME_SPEED.into()
                    * land.sell_price
                    / max_neighbors(land.location).into();

                let per_hour_expenses_percent = per_hour_expenses_percent_per_neighbour
                    * neighbors_count.into();

                // The time in unix seconds that the stake may sustain.
                // We multiply by 3600 (BASE_TIME) to get the time in seconds instead of hours,
                // and by 100 to convert the percent to the good decimal point => 1 / (x * 1/100) =
                // 100 / x
                land.stake_amount * 100 * BASE_TIME.into() / (per_hour_expenses_percent)
            } else {
                0 // No neighbors, no expenses
            };
            LandYieldInfo { yield_info, remaining_stake_time }
        }


        fn get_active_auctions(self: @ContractState) -> u8 {
            self.active_auctions.read()
        }

        fn get_auction(self: @ContractState, land_location: u64) -> Auction {
            assert(is_valid_position(land_location), 'Land location not valid');
            let mut world = self.world_default();
            let store = StoreTrait::new(world);
            store.auction(land_location)
        }
    }


    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"ponzi_land")
        }

        fn internal_claim(ref self: ContractState, mut store: Store, land: Land) {
            //generate taxes for each neighbor of claimer
            let neighbors = get_land_neighbors(store, land.location);
            if neighbors.len() != 0 {
                for neighbor in neighbors {
                    let is_nuke = self.taxes._calculate_and_distribute(store, neighbor.location);
                    let has_liquidity_requirements = self
                        .check_liquidity_pool_requirements(
                            neighbor.token_used, neighbor.sell_price, neighbor.pool_key
                        );

                    let neighbor = store.land(neighbor.location);
                    if is_nuke || !has_liquidity_requirements {
                        self.nuke(neighbor.location);
                    }
                };
            }

            //claim taxes for the land
            let taxes = self.get_pending_taxes_for_land(land.location, land.owner);
            if taxes.len() != 0 {
                self.taxes._claim(taxes, land.owner, land.location);
            }
        }

        fn buy_from_bid(
            ref self: ContractState,
            mut store: Store,
            mut land: Land,
            token_for_sale: ContractAddress,
            sell_price: u256,
            sold_at_price: u256,
            amount_to_stake: u256,
            liquidity_pool: PoolKey,
            caller: ContractAddress,
            mut auction: Auction,
        ) {
            let validation_result = self.payable.validate(land.token_used, caller, sold_at_price);
            assert(validation_result.status, errors::ERC20_VALIDATE_AMOUNT_BID);
            let pay_to_us_status = self.payable.pay_to_us(caller, validation_result);
            assert(pay_to_us_status, errors::ERC20_PAY_FOR_BID_FAILED);
            self
                .finalize_land_purchase(
                    store,
                    land.location,
                    token_for_sale,
                    sell_price,
                    amount_to_stake,
                    liquidity_pool,
                    caller,
                );
            auction.is_finished = true;
            auction.sold_at_price = Option::Some(sold_at_price);
            store.set_auction(auction);
            self.active_auctions.write(self.active_auctions.read() - 1);
            self.active_auction_queue.write(land.location, false);

            store
                .world
                .emit_event(
                    @AuctionFinishedEvent {
                        land_location: land.location,
                        buyer: land.owner,
                        start_time: auction.start_time,
                        final_time: get_block_timestamp(),
                        final_price: auction.get_current_price_decay_rate(),
                    },
                );

            //initialize auction for neighbors
            //TODO:Token for sale has to be lords or the token that we choose
            //TODO:we have to define the correct decay rate

            // Math.max(sold_at_price * 10, auction.floor_price)
            if self.active_auctions.read() < MAX_AUCTIONS {
                let asking_price = if sold_at_price > auction.floor_price {
                    sold_at_price * 10
                } else {
                    auction.floor_price * 10
                };
                self.add_spiral_auctions(store, land.location, asking_price);
            }
        }


        fn finalize_land_purchase(
            ref self: ContractState,
            mut store: Store,
            land_location: u64,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
            liquidity_pool: PoolKey,
            caller: ContractAddress,
        ) {
            let land = LandTrait::new(
                land_location,
                caller,
                token_for_sale,
                sell_price,
                liquidity_pool,
                get_block_timestamp(),
                get_block_timestamp(),
                0,
            );

            store.set_land(land);

            self.stake._add(amount_to_stake, land, store);
        }

        fn update_level(
            self: @ContractState, ref store: Store, ref land: Land, elapsed_time: u64
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
            self: @ContractState, sell_token: ContractAddress, sell_price: u256, pool_key: PoolKey
        ) -> bool {
            let main_currency = self.main_currency.read();

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
            return (sell_price * LIQUIDITY_SAFETY_MULTIPLIER.into()) < liquidity_pool.into();
        }

        fn add_spiral_auctions(
            ref self: ContractState, store: Store, land_location: u64, start_price: u256
        ) {
            let mut spiral_state = self.spiral_states.read();
            let direction = spiral_state.direction;
            //with this we can continue the auction in the last place where stop for MAX_AUCTIONS
            let steps = spiral_state.steps_remaining.unwrap_or(spiral_state.steps);
            let mut i = 0;

            while i < steps && self.active_auctions.read() < MAX_AUCTIONS {
                let mut current_head_location = self.heads.read(spiral_state.current_head);
                if let Option::Some(next_pos) =
                    get_next_position(direction, current_head_location) {
                    if store.land(next_pos).owner.is_zero()
                        && !self.active_auction_queue.read(next_pos) {
                        self.auction(next_pos, start_price, FLOOR_PRICE, DECAY_RATE, false);
                    };

                    self.heads.write(spiral_state.current_head, next_pos);
                }
                i += 1;
            };
            if i < steps {
                spiral_state.steps_remaining = Option::Some(steps - i);
            } else {
                spiral_state.steps_remaining = Option::None;
                spiral_state.current_head += 1;
                if spiral_state.current_head == 4 {
                    spiral_state.current_head = 0;
                    spiral_state.advance += 1;
                    spiral_state.direction = (spiral_state.direction + 1) % 4;
                    if spiral_state.advance % 2 == 0 {
                        spiral_state.advance = 0;
                        spiral_state.steps += 1;
                    };
                };
            }

            self.spiral_states.write(spiral_state);
        }

        fn initialize_heads(ref self: ContractState, index: u8, firts_heads: u64) {
            self.heads.write(index, firts_heads);
            let state = SpiralState {
                current_head: 0, steps: 1, advance: 0, direction: 0, steps_remaining: Option::None
            };
            self.spiral_states.write(state);
        }

        fn distribute_adjusted_taxes(
            ref self: ContractState,
            active_lands_with_taxes: Array<LandWithTaxes>,
            mut token_ratios: Felt252Dict<Nullable<u256>>
        ) {
            for land_with_taxes in active_lands_with_taxes
                .span() {
                    let land = *land_with_taxes.land;
                    let mut adjusted_taxes: Array<TokenInfo> = ArrayTrait::new();

                    if let Option::Some(taxes) = land_with_taxes.taxes {
                        for tax in taxes
                            .span() {
                                let tax = *tax;
                                let token_ratio =
                                    match match_nullable(
                                        token_ratios.get(tax.token_address.into())
                                    ) {
                                    FromNullableResult::Null => 0_u256,
                                    FromNullableResult::NotNull(val) => val.unbox(),
                                };

                                let adjuested_tax_amount = calculate_refund_amount(
                                    tax.amount, token_ratio
                                );

                                adjusted_taxes
                                    .append(
                                        TokenInfo {
                                            token_address: tax.token_address,
                                            amount: adjuested_tax_amount
                                        }
                                    )
                            }
                    }

                    self.taxes._claim(adjusted_taxes, land.owner, land.location);
                }
        }
    }
}
