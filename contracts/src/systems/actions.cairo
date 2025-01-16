use starknet::ContractAddress;

use dojo::world::WorldStorage;
use ponzi_land::models::land::Land;
use ponzi_land::components::payable::PayableComponent::{TokenInfo, ClaimInfo};

// define the interface
#[starknet::interface]
trait IActions<T> {
    fn auction(
        ref self: T,
        land_location: u64,
        start_price: u256,
        floor_price: u256,
        token_for_sale: ContractAddress,
        decay_rate: u8,
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

    fn increase_price(ref self: T, land_location: u64, new_price: u256,);

    fn increase_stake(ref self: T, land_location: u64, amount_to_stake: u256,);

    //getters
    fn get_stake_balance(self: @T, staker: ContractAddress) -> u256;
    fn get_land(self: @T, land_location: u64) -> Land;
    fn get_pending_taxes(self: @T, owner_land: ContractAddress) -> Array<TokenInfo>;
    fn get_pending_taxes_for_land(
        self: @T, land_location: u64, owner_land: ContractAddress
    ) -> Array<TokenInfo>;
    fn get_current_auction_price(self: @T, land_location: u64) -> u256;
    fn get_next_claim_info(self: @T, land_location: u64) -> Array<ClaimInfo>;
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
        PayableComponent, PayableComponent::{TokenInfo, ClaimInfo}
    };
    use ponzi_land::helpers::coord::{is_valid_position, up, down, left, right, max_neighbors};
    use ponzi_land::consts::{TAX_RATE, BASE_TIME};
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
        sell_price: u256
    }

    #[derive(Drop, Serde)]
    #[dojo::event]
    pub struct RemainingStakeEvent {
        #[key]
        land_location: u64,
        remaining_stake: u256
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
        fn nuke(ref self: ContractState, land_location: u64,) {
            let mut world = self.world_default();
            let store = StoreTrait::new(world);

            let land = store.land(land_location);
            //TODO:see how we validate the lp to nuke the land
            assert(self.get_stake_balance(land.owner) == 0, 'land with stake');

            let owner_nuked = land.owner;

            //delete land
            store.delete_land(land);

            //emit event de nuke land
            world.emit_event(@LandNukedEvent { owner_nuked, land_location });
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

            let current_price = auction.get_current_price_decay_rate();
            land.sell_price = current_price;
            store.set_land(land);

            self.internal_claim(store, land);

            self
                .buy_from_bid(
                    store,
                    land_location,
                    token_for_sale,
                    sell_price,
                    amount_to_stake,
                    liquidity_pool,
                    caller,
                    auction
                );
        }

        fn auction(
            ref self: ContractState,
            land_location: u64,
            start_price: u256,
            floor_price: u256,
            token_for_sale: ContractAddress,
            decay_rate: u8,
        ) {
            assert(is_valid_position(land_location), 'Land location not valid');
            assert(start_price > 0, 'start_price > 0');
            assert(floor_price > 0, 'floor_price > 0');

            let mut world = self.world_default();
            let mut store = StoreTrait::new(world);

            let mut land = store.land(land_location);

            assert(land.owner == ContractAddressZeroable::zero(), 'must be without owner');

            let auction = AuctionTrait::new(
                land_location, start_price, floor_price, false, decay_rate
            );
            store.set_auction(auction);

            land.sell_price = start_price;

            // land.token_used = LORDS_CURRENCY;

            land.token_used = token_for_sale;

            store.set_land(land);

            store
                .world
                .emit_event(
                    @NewAuctionEvent {
                        land_location, start_time: auction.start_time, start_price, floor_price
                    }
                );
        }


        fn increase_price(ref self: ContractState, land_location: u64, new_price: u256,) {
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
                        land_location: land.location, remaining_stake: land.stake_amount
                    }
                );
        }


        //GETTERS FUNCTIONS

        //TODO: here we have to change the return to struct of TokenInfo, no only amount
        fn get_stake_balance(self: @ContractState, staker: ContractAddress) -> u256 {
            self.payable.stake_balance.read(staker).amount
        }

        fn get_pending_taxes(
            self: @ContractState, owner_land: ContractAddress
        ) -> Array<TokenInfo> {
            self.payable._get_pending_taxes(owner_land, Option::None)
        }

        fn get_pending_taxes_for_land(
            self: @ContractState, land_location: u64, owner_land: ContractAddress
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

            let neighbors = self.payable._add_neighbors(store, land.location);
            let mut claim_info: Array<ClaimInfo> = ArrayTrait::new();

            if neighbors.len() > 0 {
                for neighbor in neighbors {
                    let current_time = get_block_timestamp();
                    let elapsed_time = current_time - neighbor.last_pay_time;

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
                        can_be_nuked: is_nuke
                    };
                    claim_info.append(claim_info_per_neighbor);
                }
            }
            claim_info
        }
    }


    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"ponzi_land")
        }

        fn internal_claim(ref self: ContractState, mut store: Store, land: Land) {
            //generate taxes for each neighbor of claimer
            let neighbors = self.payable._add_neighbors(store, land.location);
            if neighbors.len() != 0 {
                for neighbor in neighbors {
                    match self.payable._generate_taxes(store, neighbor.location) {
                        Result::Ok(remaining_stake) => {
                            if remaining_stake != 0 {
                                store
                                    .world
                                    .emit_event(
                                        @RemainingStakeEvent {
                                            land_location: neighbor.location, remaining_stake
                                        }
                                    )
                            }
                        },
                        Result::Err(_) => {
                            // println!("nuke");
                            self.nuke(neighbor.location);
                        }
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
            amount_to_stake: u256,
            liquidity_pool: ContractAddress,
            caller: ContractAddress,
            mut auction: Auction,
        ) {
            //TODO: we have to create our contract to send the tokens for the first sell
            //self.payable._pay_to_us();
            self
                .payable
                ._pay(
                    caller, get_contract_address(), store.land(land_location).token_used, sell_price
                );
            self.payable._stake(caller, token_for_sale, amount_to_stake);

            self
                .finalize_land_purchase(
                    store,
                    land_location,
                    token_for_sale,
                    sell_price,
                    amount_to_stake,
                    liquidity_pool,
                    caller
                );

            auction.is_finished = true;
            store.set_auction(auction);

            store
                .world
                .emit_event(
                    @AuctionFinishedEvent {
                        land_location,
                        start_time: auction.start_time,
                        final_time: get_block_timestamp(),
                        final_price: auction.get_current_price(),
                    }
                );
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
                        owner_land: land.owner, land_location, token_for_sale, sell_price
                    }
                );
        }
    }
}

