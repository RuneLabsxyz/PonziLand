use starknet::{ContractAddress, contract_address_const};
use starknet::contract_address::ContractAddressZeroable;
use ponzi_land::utils::common_strucs::{TokenInfo};
use ekubo::types::keys::PoolKey as EkuboPoolKey;

#[derive(Drop, Serde, Copy, Debug)]
#[dojo::model]
pub struct Land {
    #[key]
    pub location: u16, // 64 x 64 land
    pub block_date_bought: u64,
    pub owner: ContractAddress,
    pub sell_price: u256,
    pub token_used: ContractAddress,
    pub level: Level,
}
#[derive(Drop, Serde, Copy)]
#[dojo::model]
pub struct LandStake {
    #[key]
    pub location: u16,
    pub amount: u256,
    pub neighbors_info_packed: u128,
}


#[derive(Serde, Drop, Copy, PartialEq, Introspect, Debug)]
pub enum Level {
    Zero,
    First,
    Second,
}

#[derive(Copy, Drop, Serde, PartialEq, Hash, Introspect, Debug)]
pub struct PoolKey {
    pub token0: ContractAddress,
    pub token1: ContractAddress,
    pub fee: u128,
    pub tick_spacing: u128,
    pub extension: ContractAddress,
}

// Impl from/to EkuboPoolKey
#[generate_trait]
impl PoolKeyConversion of PoolKeyTrait {
    #[inline(always)]
    fn from_ekubo(pool_key: EkuboPoolKey) -> PoolKey {
        PoolKey {
            token0: pool_key.token0,
            token1: pool_key.token1,
            fee: pool_key.fee,
            tick_spacing: pool_key.tick_spacing,
            extension: pool_key.extension,
        }
    }

    #[inline(always)]
    fn to_ekubo(self: PoolKey) -> EkuboPoolKey {
        EkuboPoolKey {
            token0: self.token0,
            token1: self.token1,
            fee: self.fee,
            tick_spacing: self.tick_spacing,
            extension: self.extension,
        }
    }
}


#[generate_trait]
impl LandImpl of LandTrait {
    #[inline(always)]
    fn new(
        location: u16,
        owner: ContractAddress,
        token_used: ContractAddress,
        sell_price: u256,
        block_date_bought: u64,
    ) -> Land {
        Land { location, owner, token_used, sell_price, block_date_bought, level: Level::Zero }
    }
}

