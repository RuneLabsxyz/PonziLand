
use starknet::contract_address::ContractAddressZeroable;
use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::models::land::Land;
use ponzi_land::helpers::coord::{left, right, up, down, max_neighbors};

fn add_neighbors_for_auction(mut store: Store, land_location: u64) -> Array<Land> {
    let mut neighbors: Array<Land> = ArrayTrait::new();

    append_neighbor_for_auction(store, left(land_location), ref neighbors);
    append_neighbor_for_auction(store, right(land_location), ref neighbors);
    append_neighbor_for_auction(store, up(land_location), ref neighbors);
    append_neighbor_for_auction(store, down(land_location), ref neighbors);

    neighbors
}

fn append_neighbor_for_auction(
    mut store: Store, location_option: Option<u64>, ref neighbors: Array<Land>
) {
    match location_option {
        Option::Some(location) => {
            let land = store.land(location);
            let auction = store.auction(land.location);
            if land.owner == ContractAddressZeroable::zero() && auction.start_time == 0 {
                neighbors.append(land);
            }
        },
        Option::None => {}
    }
}


fn add_neighbors(mut store: Store, land_location: u64, only_with_owners: bool,) -> Array<Land> {
    let mut neighbors: Array<Land> = ArrayTrait::new();
    add_neighbor(store, ref neighbors, left(land_location), only_with_owners);
    add_neighbor(store, ref neighbors, right(land_location), only_with_owners);
    add_neighbor(store, ref neighbors, up(land_location), only_with_owners);
    add_neighbor(store, ref neighbors, down(land_location), only_with_owners);

    // For diagonal neighbors, we need to handle nested Options
    match up(land_location) {
        Option::Some(up_location) => {
            add_neighbor(store, ref neighbors, left(up_location), only_with_owners);
            add_neighbor(store, ref neighbors, right(up_location), only_with_owners);
        },
        Option::None => {}
    }

    match down(land_location) {
        Option::Some(down_location) => {
            add_neighbor(store, ref neighbors, left(down_location), only_with_owners);
            add_neighbor(store, ref neighbors, right(down_location), only_with_owners);
        },
        Option::None => {}
    }
    neighbors
}

fn add_neighbor(
    mut store: Store,
    ref neighbors: Array<Land>,
    land_location: Option<u64>,
    only_with_owners: bool,
) {
    match land_location {
        Option::Some(location) => {
            let land = store.land(location);
            if !only_with_owners || land.owner != ContractAddressZeroable::zero() {
                neighbors.append(land);
            }
        },
        Option::None => {}
    }
}



