//Dejar funcionando esto , vemos paso a paso errores de build, algunas funciones van a tener que
//cambiar lo que devuelven porque se van a llamar de distintos lados

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
// a lo mejor generate taxes tiene que estar en algun componente, en pending taxes
// fn _generate_taxes(
//     ref self: ComponentState<TContractState>, mut store: Store, land_location: u64
// ) -> Result<u256, felt252> {
//     let mut land = store.land(land_location);

//     //generate taxes for each neighbor of neighbor
//     let mut neighbors: Array<Land> = self._add_neighbors(store, land_location, true);

//     //if we dont have neighbors we dont have to pay taxes
//     let neighbors_with_owners = neighbors.len();
//     if neighbors_with_owners == 0 {
//         land.last_pay_time = get_block_timestamp();
//         store.set_land(land);
//         return Result::Ok(0);
//     }

//     //calculate the total taxes
//     let current_time = get_block_timestamp();
//     let elapsed_time = (current_time - land.last_pay_time) * TIME_SPEED.into();
//     let total_taxes: u256 = (land.sell_price * TAX_RATE.into() * elapsed_time.into())
//         / (100 * BASE_TIME.into());

//     // Calculate the tax per neighbor (divided by the maximum possible neighbors)
//     let tax_per_neighbor = total_taxes / max_neighbors(land_location).into();

//     // Calculate the total tax to distribute (only to existing neighbors)
//     let tax_to_distribute = tax_per_neighbor * neighbors_with_owners.into();

//     //if we dont have enough stake to pay the taxes,we distrubute the total amount of stake
//     //and after we nuke the land
//     let (tax_to_distribute, is_nuke) = if land.stake_amount <= tax_to_distribute {
//         (land.stake_amount, true)
//     } else {
//         (tax_to_distribute, false)
//     };

//     //distribute the taxes to each neighbor
//     let tax_per_neighbor = tax_to_distribute / neighbors_with_owners.into();
//     for neighbor in neighbors
//         .span() {
//             self
//                 ._add_taxes(
//                     *neighbor.owner, land.token_used, tax_per_neighbor, *neighbor.location
//                 );
//         };

//     self._discount_stake_for_taxes(land.owner, tax_to_distribute);

//     land.last_pay_time = current_time;
//     land.stake_amount = land.stake_amount - tax_to_distribute;
//     store.set_land(land);
//     if is_nuke {
//         Result::Err('Nuke')
//     } else {
//         Result::Ok(self.stake_balance.read(land.owner).amount)
//     }
// }

