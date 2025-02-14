use dojo::world::{WorldStorage};
use dojo::model::{ModelStorage, ModelValueStorage};

use ponzi_land::models::land::{Land, PoolKey};
use ponzi_land::models::auction::Auction;
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
    fn land(self: Store, land_location: u64) -> Land {
        self.world.read_model(land_location)
    }

    #[inline(always)]
    fn auction(self: Store, land_location: u64) -> Auction {
        self.world.read_model(land_location)
    }

    // Setter
    #[inline(always)]
    fn set_land(mut self: Store, land: Land) {
        self.world.write_model(@land);
    }

    #[inline(always)]
    fn set_auction(mut self: Store, auction: Auction) {
        self.world.write_model(@auction);
    }

    // Deleter
    #[inline(always)]
    fn delete_land(mut self: Store, mut land: Land) {
        //TODO:Waiting for a fix of dojo
        // self.world.erase_model(@land);
        let pool_key = PoolKey {
            token0: ContractAddressZeroable::zero(),
            token1: ContractAddressZeroable::zero(),
            fee: 0,
            tick_spacing: 0,
            extension: ContractAddressZeroable::zero()
        };

        land.owner = ContractAddressZeroable::zero();
        land.block_date_bought = 0;
        land.sell_price = 0;
        land.token_used = ContractAddressZeroable::zero();
        land.pool_key = pool_key;
        land.last_pay_time = 0;
        land.stake_amount = 0;
        self.world.write_model(@land);
    }
}
