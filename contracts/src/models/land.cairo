use core::starknet::storage_access::StorePacking;

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
#[derive(Drop, Serde, Debug, Copy)]
#[dojo::model]
pub struct LandStake {
    #[key]
    pub location: u16,
    pub amount: u256,
    //TODO:THIS HAS TO BE PACKED STRUCT -> NeighborInfo
    pub num_active_neighbors: u8,
    pub earliest_claim_neighbor_time: u64,
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
//TODO:See if we can use this trait inside of a dojo model

// #[derive(Drop, Serde, Copy, Debug, Introspect)]
// pub struct NeighborInfo {
//     pub earliest_claim_neighbor_time: u64, // 64 bits
//     pub num_active_neighbors: u8 // 8 bits
// }
// // Implement StorePacking for NeighborInfo, packing into a u128
// impl NeighborInfoStorePacking of StorePacking<NeighborInfo, u128> {
//     // Packs the NeighborInfo struct into a single u128
//     fn pack(value: NeighborInfo) -> u128 {
//         // Shift the u64 value to the left by 8 bits to make space for the u8
//         let time_shifted: u128 = value.earliest_claim_neighbor_time.into()
//             * 256_u128; // 2^8 =256 // Add the u8 value to the lower 8 bits
//         let packed_value: u128 = time_shifted + value.num_active_neighbors.into();
//         packed_value
//     }

//     // Unpacks a u128 back into a NeighborInfo struct
//     fn unpack(value: u128) -> NeighborInfo {
//         // Use a mask to extract the lower 8 bits (u8 value)
//         let num_neighbors_u128 = value & 0xff_u128; // 0xff is 2^8 - 1
//         let num_active_neighbors: u8 = num_neighbors_u128.try_into().unwrap();

//         // Shift the u128 value to the right by 8 bits to get the u64 value
//         let time_u128 = value / 256_u128; // 2^8 = 256
//         let earliest_claim_neighbor_time: u64 = time_u128.try_into().unwrap();

//         NeighborInfo { earliest_claim_neighbor_time, num_active_neighbors }
//     }
// }


