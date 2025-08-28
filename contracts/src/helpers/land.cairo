use starknet::ContractAddress;
use ponzi_land::models::land::{Land, LandStake};
use ponzi_land::utils::packing::{pack_neighbors_info, unpack_neighbors_info};
use ponzi_land::store::{Store, StoreTrait};


#[inline(always)]
pub fn update_neighbors_info(
    store: Store, neighbors: Span<Land>, land_location: u16, current_time: u64,
) {
    for neighbor in neighbors {
        if let Option::Some(updated_neighbor) =
            add_neighbor(store.land_stake(*neighbor.location), land_location, current_time) {
            store.set_land_stake(updated_neighbor);
        }
    };
}

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

/// Updates all neighbors of a deleted land to reflect that the land no longer exists
/// This should be called AFTER the land is deleted from storage to maintain consistency
#[inline(always)]
pub fn update_neighbors_after_delete(store: Store, deleted_land_neighbors: Span<Land>) {
    for neighbor in deleted_land_neighbors {
        let neighbor_stake = store.land_stake(*neighbor.location);

        if let Option::Some(updated_stake) = remove_neighbor(neighbor_stake) {
            store.set_land_stake(updated_stake);
        }
    }
}
