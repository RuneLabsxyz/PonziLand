use starknet::ContractAddress;

use dojo::world::WorldStorage;
use ponzi_land::models::land::Land;
use ponzi_land::models::auction::Auction;
use ponzi_land::components::payable::PayableComponent::{TokenInfo, ClaimInfo, LandYieldInfo};

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
        liquidity_pool: ContractAddress,
    );
    fn buy(
        ref self: T,
        land_location: u64,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
        liquidity_pool: ContractAddress,
    );

    fn claim(ref self: T, land_location: u64);

    fn nuke(ref self: T, land_location: u64);

    fn increase_price(ref self: T, land_location: u64, new_price: u256);

    fn increase_stake(ref self: T, land_location: u64, amount_to_stake: u256);

    //getters
    fn get_stake_balance(self: @T, staker: ContractAddress) -> u256;
    fn get_land(self: @T, land_location: u64) -> Land;
    fn get_pending_taxes(self: @T, owner_land: ContractAddress) -> Array<TokenInfo>;
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
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::contract_address::ContractAddressZeroable;
    use dojo::model::{ModelStorage, ModelValueStorage};
    use ponzi_land::models::land::{Land, LandTrait};
    use ponzi_land::models::auction::{Auction, AuctionTrait};
    use ponzi_land::components::payable::{
        PayableComponent, PayableComponent::{TokenInfo, ClaimInfo, YieldInfo, LandYieldInfo},
    };
    use ponzi_land::helpers::coord::{is_valid_position, up, down, left, right, max_neighbors};
    use ponzi_land::consts::{
        TAX_RATE, BASE_TIME, TIME_SPEED, MAX_AUCTIONS, DECAY_RATE, FLOOR_PRICE,
    };
    use ponzi_land::store::{Store, StoreTrait};
    use dojo::event::EventStorage;

    // use ponzi_land::tokens::main_currency::LORDS_CURRENCY;

    component!(path: PayableComponent, storage: payable, event: PayableEvent);
    impl PayableInternalImpl = PayableComponent::InternalImpl<ContractState>;

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        PayableEvent: PayableComponent::Event,
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
    pub struct NewLandEvent {
        #[key]
        owner_land: ContractAddress,
        #[key]
        land_location: u64,
        token_for_sale: ContractAddress,
        sell_price: u256,
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
        start_time: u64,
        final_time: u64,
        final_price: u256,
    }


    // Storage
    #[storage]
    struct Storage {
        #[substorage(v0)]
        payable: PayableComponent::Storage,
        active_auctions: u8,
        main_currency: ContractAddress,
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
    ) {
        self.main_currency.write(token_address);

        let lands: Array<u64> = array![land_1, land_2, land_3, land_4];
        for land_location in lands {
            self.auction(land_location, start_price, floor_price, decay_rate, false);
        }
    }


    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn buy(
            ref self: ContractState,
            land_location: u64,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
            liquidity_pool: ContractAddress,
        ) {
            assert(is_valid_position(land_location), 'Land location not valid');
            assert(sell_price > 0, 'sell_price > 0');
            assert(amount_to_stake > 0, 'amount_to_stake > 0');

            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut store = StoreTrait::new(world);
            let land = store.land(land_location);
            assert(caller != land.owner, 'you already own this land');

            assert(land.owner != ContractAddressZeroable::zero(), 'must have a owner');
            self.internal_claim(store, land);

            self.payable._pay(caller, land.owner, land.token_used, land.sell_price);
            self.payable._refund_of_stake(land.owner, land.stake_amount);
            self.payable._stake(caller, token_for_sale, amount_to_stake);

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
        }


        fn claim(ref self: ContractState, land_location: u64) {
            assert(is_valid_position(land_location), 'Land location not valid');

            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);

            let land = store.land(land_location);
            let caller = get_caller_address();
            assert(land.owner == caller, 'not the owner');
            self.internal_claim(store, land);
        }


        // TODO:see if we want pass this function into internalTrait
        fn nuke(ref self: ContractState, land_location: u64) {
            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);
            let mut land = store.land(land_location);
            //TODO:see how we validate the lp to nuke the land
            assert(land.stake_amount == 0, 'land with stake');
            let pending_taxes = self.get_pending_taxes_for_land(land.location, land.owner);
            if pending_taxes.len() != 0 {
                self.payable._claim_taxes(pending_taxes, land.owner, land.location);
            }

            let owner_nuked = land.owner;
            let sell_price = land.sell_price;
            //delete land
            store.delete_land(land);

            //emit event de nuke land
            world.emit_event(@LandNukedEvent { owner_nuked, land_location });

            //TODO:We have to decide how has to be the sell_price, and the decay_rate
            self.auction(land_location, sell_price * 10, FLOOR_PRICE, DECAY_RATE * 2, true);
        }

        //Bid offer(in a main currency(Lords?))
        // how we know who will be the owner of the land?
        fn bid(
            ref self: ContractState,
            land_location: u64,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
            liquidity_pool: ContractAddress,
        ) {
            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);

            let mut land = store.land(land_location);
            let caller = get_caller_address();
            //find the way to validate the liquidity pool for the new token_for_sale
            //some assert();
            assert(is_valid_position(land_location), 'Land location not valid');
            assert(land.owner == ContractAddressZeroable::zero(), 'must be without owner');
            assert(sell_price > 0, 'sell_price > 0');
            assert(amount_to_stake > 0, 'amount_to_stake > 0');

            //auction part

            //Validate if the land can be buyed because is an auction happening for that land
            let mut auction = store.auction(land_location);
            assert(!auction.is_finished, 'auction is finished');
            assert(auction.start_price > 0, 'auction not started');
            assert(auction.start_time > 0, 'auction not started');

            let current_price = auction.get_current_price_decay_rate();
            land.sell_price = sell_price;
            store.set_land(land);

            self.internal_claim(store, land);

            self
                .buy_from_bid(
                    store,
                    land_location,
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
            let mut store = StoreTrait::new(world);

            let mut land = store.land(land_location);
            let caller = get_caller_address();

            assert(land.owner == caller, 'not the owner');
            assert(new_price > land.sell_price, 'new_price != land.sell_price');

            land.sell_price = new_price;
            store.set_land(land);
        }

        fn increase_stake(ref self: ContractState, land_location: u64, amount_to_stake: u256) {
            assert(is_valid_position(land_location), 'Land location not valid');

            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);

            let mut land = store.land(land_location);
            let caller = get_caller_address();

            assert(land.owner == caller, 'not the owner');

            self.payable._stake(caller, land.token_used, amount_to_stake);

            land.stake_amount = land.stake_amount + amount_to_stake;
            store.set_land(land);

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


        //GETTERS FUNCTIONS

        //TODO: here we have to change the return to struct of TokenInfo, no only amount
        fn get_stake_balance(self: @ContractState, staker: ContractAddress) -> u256 {
            self.payable.stake_balance.read(staker).amount
        }

        fn get_pending_taxes(
            self: @ContractState, owner_land: ContractAddress,
        ) -> Array<TokenInfo> {
            self.payable._get_pending_taxes(owner_land, Option::None)
        }

        fn get_pending_taxes_for_land(
            self: @ContractState, land_location: u64, owner_land: ContractAddress,
        ) -> Array<TokenInfo> {
            self.payable._get_pending_taxes(owner_land, Option::Some(land_location))
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

            let neighbors = self.payable._add_neighbors(store, land.location, true);
            let mut claim_info: Array<ClaimInfo> = ArrayTrait::new();

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

            let neighbors = self.payable._add_neighbors(store, land.location, true);
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
            let neighbors = self.payable._add_neighbors(store, land.location, true);
            if neighbors.len() != 0 {
                for neighbor in neighbors {
                    match self.payable._generate_taxes(store, neighbor.location) {
                        Result::Ok(remaining_stake) => {
                            if remaining_stake != 0 {
                                store
                                    .world
                                    .emit_event(
                                        @RemainingStakeEvent {
                                            land_location: neighbor.location, remaining_stake,
                                        },
                                    )
                            }
                        },
                        Result::Err(_) => {
                            // println!("nuke");
                            self.nuke(neighbor.location);
                        },
                    };
                };
            }

            //claim taxes for the land
            let taxes = self.get_pending_taxes_for_land(land.location, land.owner);
            if taxes.len() != 0 {
                self.payable._claim_taxes(taxes, land.owner, land.location);
            }
        }


        fn buy_from_bid(
            ref self: ContractState,
            mut store: Store,
            land_location: u64,
            token_for_sale: ContractAddress,
            sell_price: u256,
            sold_at_price: u256,
            amount_to_stake: u256,
            liquidity_pool: ContractAddress,
            caller: ContractAddress,
            mut auction: Auction,
        ) {
            //TODO: we have to create our contract to send the tokens for the first sell
            //self.payable._pay_to_us();
            let land = store.land(land_location);
            self.payable._pay(caller, get_contract_address(), land.token_used, sold_at_price);
            self.payable._stake(caller, token_for_sale, amount_to_stake);

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

            auction.is_finished = true;
            store.set_auction(auction);
            self.active_auctions.write(self.active_auctions.read() - 1);

            store
                .world
                .emit_event(
                    @AuctionFinishedEvent {
                        land_location,
                        start_time: auction.start_time,
                        final_time: get_block_timestamp(),
                        final_price: auction.get_current_price_decay_rate(),
                    },
                );

            //initialize auction for neighbors
            //TODO:Token for sale has to be lords or the token that we choose
            //TODO:we have to define the correct decay rate

            // Math.max(sold_at_price * 10, auction.floor_price)
            let asking_price = if sold_at_price > auction.floor_price {
                sold_at_price * 10
            } else {
                auction.floor_price * 10
            };

            self
                .initialize_auction_for_neighbors(
                    // The floor price and decay_rate are extracted from the current auction, to
                    // always propagate the values from the intial auctions
                    store, land_location, asking_price, auction.floor_price, auction.decay_rate,
                );
        }

        fn initialize_auction_for_neighbors(
            ref self: ContractState,
            mut store: Store,
            land_location: u64,
            start_price: u256,
            floor_price: u256,
            decay_rate: u64,
        ) {
            let neighbors = self.payable._add_neighbors_for_auction(store, land_location);
            if neighbors.len() != 0 {
                for neighbor in neighbors {
                    self.auction(neighbor.location, start_price, floor_price, decay_rate, false);
                }
            }
        }

        fn finalize_land_purchase(
            ref self: ContractState,
            mut store: Store,
            land_location: u64,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
            liquidity_pool: ContractAddress,
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
                amount_to_stake,
            );

            store.set_land(land);

            store
                .world
                .emit_event(
                    @NewLandEvent {
                        owner_land: land.owner, land_location, token_for_sale, sell_price,
                    },
                );
        }
    }
}
