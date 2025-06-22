use starknet::{ContractAddress, contract_address_const};
use starknet::contract_address::ContractAddressZeroable;
use ponzi_land::utils::common_strucs::{TokenInfo};
use ekubo::types::keys::PoolKey as EkuboPoolKey;

#[derive(Drop, Serde, Debug, Copy)]
#[dojo::model]
pub struct Land {
    #[key]
    pub location: u16, // 64 x 64 land
    pub block_date_bought: u64,
    pub owner: ContractAddress,
    pub sell_price: u256,
    pub token_used: ContractAddress,
    //we will use this for taxes
    pub level: Level,
}
#[derive(Drop, Serde, Copy, IntrospectPacked)]
#[dojo::model]
pub struct LandStake {
    #[key]
    pub location: u16,
    pub amount: u256,
    pub neighbors_info_packed: felt252,
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

pub type NeighborsInfo = (u64, u8, u16);

const SHIFT_16: u256 = 65536;
const SHIFT_8: u256 = 256;

pub fn pack_neighbors_info(
    earliest_claim_neighbor_time: u64,
    num_active_neighbors: u8,
    earliest_claim_neighbor_location: u16,
) -> felt252 {
    let mut packed: u256 = 0;
    packed = packed + earliest_claim_neighbor_time.into();
    packed = packed * SHIFT_8 + num_active_neighbors.into();
    packed = packed * SHIFT_16 + earliest_claim_neighbor_location.into();
    packed.try_into().unwrap()
}

pub fn unpack_neighbors_info(packed_value: felt252) -> NeighborsInfo {
    let mut packed: u256 = packed_value.into();
    let location: u16 = (packed % SHIFT_16).try_into().unwrap();
    packed = packed / SHIFT_16;
    let neighbors: u8 = (packed % SHIFT_8).try_into().unwrap();
    packed = packed / SHIFT_8;
    let time: u64 = packed.try_into().unwrap();
    (time, neighbors, location)
}

