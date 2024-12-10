use starknet::ContractAddress;

use dojo::world::WorldStorage;
use ponzi_land::models::land::Land;
use ponzi_land::components::payable::PayableComponent::TokenInfo;

// define the interface
#[starknet::interface]
trait IActions<T> {
    fn bid(ref self: T);
    fn buy(
        ref self: T,
        liquidity_pool: ContractAddress,
        token_for_sale: ContractAddress,
        sell_price: u64,
        land_location: u64,
        amount_to_stake: u64
    );

    fn generate_taxes(ref self: T, land_location: u64);
    fn claim(ref self: T);

    fn nuke(ref self: T);

    fn create_land(
        ref self: T,
        location: u64,
        sell_price: u64,
        token_used: ContractAddress,
        pool_key: ContractAddress,
        stake_amount: u64
    )->Land;

    
    //getters
    fn get_stake_balance(self: @T, staker: ContractAddress) -> u64;
    fn get_land(self: @T, land_location: u64) -> Land;
    fn get_pending_taxes(self:@T,owner_land:ContractAddress)-> Array<TokenInfo>;
}

// dojo decorator
#[dojo::contract]
pub mod actions {
    use super::{IActions, WorldStorage};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::contract_address::ContractAddressZeroable;
    use dojo::model::{ModelStorage, ModelValueStorage};
    use ponzi_land::models::land::Land;
    use ponzi_land::components::payable::{PayableComponent,PayableComponent::TokenInfo};
    use ponzi_land::helpers::coord::{is_valid_position, up, down, left, right};
    use ponzi_land::consts::{TAX_RATE};

    component!(path: PayableComponent, storage: payable, event: PayableEvent);
    impl PayableInternalImpl = PayableComponent::InternalImpl<ContractState>;

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        PayableEvent: PayableComponent::Event,
        LandEvent: LandCreated,
    }

    #[derive(Drop, starknet::Event)]
    struct LandCreated {
        land: Land
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
            liquidity_pool: ContractAddress,
            token_for_sale: ContractAddress,
            sell_price: u64,
            land_location: u64,
            amount_to_stake: u64,
        ) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut land: Land = world.read_model(land_location);

            //preguntar si es mejor ponerlo al principio de la funcion por temas de gas
            assert(is_valid_position(land_location), 'Land location not valid');
            assert(sell_price > 0, 'sell_price > 0');

            self.payable._validate(caller, token_for_sale, land.sell_price);

            // //find the way to validate the liquidity pool for the new token_for_sale
            // //some assert();

            self.payable._pay(caller, land.owner, land.sell_price.into());

            //TODO:we have to see in what moment we do the stake for the first sell
            // self.payable._refund_of_stake(land.owner);

            self.payable._stake(caller, token_for_sale, amount_to_stake);

            land.owner = caller;
            land.block_date_bought = get_block_timestamp();
            land.sell_price = sell_price;
            land.pool_key = liquidity_pool;
            land.token_used = token_for_sale;

            world.write_model(@land);
        }

        fn claim(ref self: ContractState) { //do shit
        }

        fn nuke(
            ref self: ContractState
        ) { // nuke all land wherer the LP is smaller than the sell price
        }

        //inputs: LP, token to sell for, price, Bid offer(in a main currency(Lords?))

        //In this function we want to use the auction logic and then reuse the buy function?

        fn bid(ref self: ContractState) { // to buy fresh unowned land
        // bid on a land
        }

        fn generate_taxes(ref self: ContractState, land_location: u64) {
            assert(is_valid_position(land_location), 'Land location not valid');

            let mut world = self.world_default();

            let mut land: Land = world.read_model(land_location);

            //see how we can fill this with test
            //this means that the land don't have more stake to pay taxes
            if self.get_stake_balance(land.owner) <= 0 {
                return self.nuke();
            }

            let mut neighbors: Array<u64> = ArrayTrait::new();

            // Add neighbors
            self.add_if_neighbor_exists(ref neighbors, left(land_location));
            self.add_if_neighbor_exists(ref neighbors, right(land_location));
            self.add_if_neighbor_exists(ref neighbors, up(land_location));
            self.add_if_neighbor_exists(ref neighbors, down(land_location));

            // For diagonal neighbors, we need to handle nested Options
            match up(land_location) {
                Option::Some(up_location) => {
                    self.add_if_neighbor_exists(ref neighbors, left(up_location));
                    self.add_if_neighbor_exists(ref neighbors, right(up_location));
                },
                Option::None => {}
            }

            match down(land_location) {
                Option::Some(down_location) => {
                    self.add_if_neighbor_exists(ref neighbors, left(down_location));
                    self.add_if_neighbor_exists(ref neighbors, right(down_location));
                },
                Option::None => {}
            }

            let tax_per_neighbor: u64 = land.sell_price * TAX_RATE / 100 / neighbors.len().into();
            let total_taxes:u64 = land.sell_price * TAX_RATE / 100 ;
            self.payable._discount_stake_for_taxes(land.owner,total_taxes);
            for
            location
            in
            neighbors.span()
            {
                let neighbor: Land = world.read_model(*location);
                if  neighbor.owner != ContractAddressZeroable::zero() {
                    self.payable._add_taxes(neighbor.owner,land.token_used,tax_per_neighbor);
                }

            }
        }

  

        fn get_stake_balance(self: @ContractState, staker: ContractAddress) -> u64 {
            self.payable.stake_balance.read(staker).amount
        }

        fn get_pending_taxes(self:@ContractState,owner_land:ContractAddress)-> Array<TokenInfo>{
            let mut token_info:Array<TokenInfo>  = ArrayTrait::new();

            let taxes_length = self.payable.pending_taxes_length.read(owner_land);
            for mut i in 0..taxes_length{
                token_info.append(self.payable.pending_taxes.read((owner_land,i)))
            };
            token_info
        }

        fn get_land(self: @ContractState, land_location: u64) -> Land {
            assert(is_valid_position(land_location), 'Land location not valid');
            let mut world = self.world_default();
            let mut land: Land = world.read_model(land_location);
            land
        }
        //I will change this for bid function after, only for fast test
        fn create_land(
            ref self: ContractState,
            location: u64,
            sell_price: u64,
            token_used: ContractAddress,
            pool_key: ContractAddress,
            stake_amount: u64
        )->Land {
            assert(is_valid_position(location), 'Land location not valid');
            let mut world = self.world_default();
            let mut land: Land = world.read_model(location);
            let caller = get_caller_address();
            land.owner = caller;
            land.block_date_bought = get_block_timestamp();
            land.sell_price = sell_price;
            land.pool_key = pool_key;
            land.token_used = token_used;
            self.payable._stake(caller, token_used, stake_amount);

            world.write_model(@land);
            self.emit(LandCreated { land });
            land
        }
    // fn get_all_lands(self:@ContractState)-> Array<Land>{
    //     let mut world =  self.world_default();

    // }
    }


    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// This function is handy since the ByteArray can't be const.
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"ponzi_land")
        }

        fn add_if_neighbor_exists(
            self: @ContractState, ref neighbors: Array<u64>, land_location: Option<u64>
        ) {
            match land_location {
                Option::Some(x) => neighbors.append(x),
                Option::None => {}
            }
        }
    }
}

