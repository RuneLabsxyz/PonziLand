// src/utils/land_helpers.cairo

use starknet::ContractAddress;
use ponzi_land::models::land::{LandStake};
use ponzi_land::utils::packing::{pack_neighbors_info, unpack_neighbors_info};

/// Updates neighbor information when a new neighbor is added
pub fn add_neighbor(
    mut stake: LandStake, land_location: u16, current_time: u64,
) -> Option<LandStake> {
    if stake.amount == 0 {
        return Option::None;
    }

    let (earliest_claim_neighbor_time, num_active_neighbors, earliest_claim_neighbor_location) =
        unpack_neighbors_info(
        stake.neighbors_info_packed,
    );

    let new_time = if earliest_claim_neighbor_time == 0 {
        current_time
    } else {
        earliest_claim_neighbor_time
    };
    let new_location = if earliest_claim_neighbor_location == 0 {
        land_location
    } else {
        earliest_claim_neighbor_location
    };

    stake
        .neighbors_info_packed =
            pack_neighbors_info(
                new_time, num_active_neighbors + 1, // Increment neighbor count
                new_location,
            );

    Option::Some(stake)
}

/// Updates neighbor information when a neighbor is removed
pub fn remove_neighbor(mut stake: LandStake) -> Option<LandStake> {
    if stake.amount == 0 {
        return Option::None;
    }

    let (earliest_claim_neighbor_time, num_active_neighbors, earliest_claim_neighbor_location) =
        unpack_neighbors_info(
        stake.neighbors_info_packed,
    );

    // Ensure we don't underflow
    let new_count = if num_active_neighbors == 0 {
        0
    } else {
        num_active_neighbors - 1
    };

    // Only update if there was a change
    if num_active_neighbors != new_count {
        stake
            .neighbors_info_packed =
                pack_neighbors_info(
                    earliest_claim_neighbor_time, new_count, earliest_claim_neighbor_location,
                );
        Option::Some(stake)
    } else {
        Option::None
    }
}
