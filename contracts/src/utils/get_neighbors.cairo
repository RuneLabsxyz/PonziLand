use starknet::contract_address::ContractAddressZeroable;
use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::models::land::Land;
use ponzi_land::helpers::coord::{
    left, right, up, down, max_neighbors, up_left, up_right, down_left, down_right
};


fn add_neighbors(mut store: Store, land_location: u64, only_with_owners: bool,) -> Array<Land> {
    let mut neighbors: Array<Land> = ArrayTrait::new();
    add_neighbor(store, ref neighbors, left(land_location), only_with_owners);
    add_neighbor(store, ref neighbors, right(land_location), only_with_owners);
    add_neighbor(store, ref neighbors, up(land_location), only_with_owners);
    add_neighbor(store, ref neighbors, down(land_location), only_with_owners);

    // For diagonal neighbors, we need to handle nested Options
    add_neighbor(store, ref neighbors, up_left(land_location), only_with_owners);
    add_neighbor(store, ref neighbors, up_right(land_location), only_with_owners);
    add_neighbor(store, ref neighbors, down_left(land_location), only_with_owners);
    add_neighbor(store, ref neighbors, down_right(land_location), only_with_owners);

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
            if !only_with_owners || !land.owner.is_zero() {
                neighbors.append(land);
            }
        },
        Option::None => {}
    }
}

