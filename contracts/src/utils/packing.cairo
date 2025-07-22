use starknet::storage_access::StorePacking;
#[derive(Drop, Serde, Copy, PartialEq)]
pub struct NeighborsInfo {
    pub earliest_claim_neighbor_time: u64,
    pub num_active_neighbors: u8,
    pub earliest_claim_neighbor_location: u16,
}

// Constants for bit manipulation
const TWO_POW_8: u128 = 0x100; // 2^8
const TWO_POW_16: u128 = 0x10000; // 2^16
const TWO_POW_24: u128 = 0x1000000; // 2^24

// Bit masks
const MASK_8: u128 = 0xff; // 8 bits
const MASK_16: u128 = 0xffff; // 16 bits
const MASK_64: u128 = 0xffffffffffffffff; // 64 bits

impl NeighborsInfoPacking of StorePacking<NeighborsInfo, u128> {
    #[inline(always)]
    fn pack(value: NeighborsInfo) -> u128 {
        value.earliest_claim_neighbor_time.into() * TWO_POW_24 // Uses bits 24-87
            + value.num_active_neighbors.into() * TWO_POW_16 // Uses bits 16-23
            + value.earliest_claim_neighbor_location.into() // Uses bits 0-15
    }

    #[inline(always)]
    fn unpack(value: u128) -> NeighborsInfo {
        let location = (value & MASK_16).try_into().unwrap(); // First 16 bits
        let neighbors = ((value / TWO_POW_16) & MASK_8).try_into().unwrap(); // Next 8 bits
        let time = (value / TWO_POW_24).try_into().unwrap(); // Next 64 bits

        NeighborsInfo {
            earliest_claim_neighbor_time: time,
            num_active_neighbors: neighbors,
            earliest_claim_neighbor_location: location,
        }
    }
}

// Keep the original functions for backward compatibility
#[inline(always)]
pub fn pack_neighbors_info(
    earliest_claim_neighbor_time: u64,
    num_active_neighbors: u8,
    earliest_claim_neighbor_location: u16,
) -> u128 {
    NeighborsInfoPacking::pack(
        NeighborsInfo {
            earliest_claim_neighbor_time, num_active_neighbors, earliest_claim_neighbor_location,
        },
    )
}

#[inline(always)]
pub fn unpack_neighbors_info(packed: u128) -> (u64, u8, u16) {
    let info = NeighborsInfoPacking::unpack(packed);
    (
        info.earliest_claim_neighbor_time,
        info.num_active_neighbors,
        info.earliest_claim_neighbor_location,
    )
}
