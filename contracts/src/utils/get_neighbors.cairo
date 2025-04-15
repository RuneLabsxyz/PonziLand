use ponzi_land::consts::{MIN_AUCTION_PRICE, FACTOR_FOR_SELL_PRICE};
use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::models::land::Land;
use ponzi_land::models::auction::Auction;
use ponzi_land::helpers::coord::{
    left, right, up, down, max_neighbors, up_left, up_right, down_left, down_right,
};
use core::nullable::{Nullable, NullableTrait, match_nullable, FromNullableResult};
use core::dict::{Felt252Dict, Felt252DictTrait, Felt252DictEntryTrait};


fn process_neighbors_of_neighbors(
    mut store: Store, neighbors: Array<Land>,
) -> Felt252Dict<Nullable<Array<Land>>> {
    let mut neighbors_with_their_neighbors: Felt252Dict<Nullable<Array<Land>>> = Default::default();

    for neighbor in neighbors {
        let their_neighbors = get_land_neighbors(store, neighbor.location);
        neighbors_with_their_neighbors
            .insert(neighbor.location.into(), NullableTrait::new(their_neighbors));
    };

    neighbors_with_their_neighbors
}

fn get_neighbors_of_neighbors(
    ref dict: Felt252Dict<Nullable<Array<Land>>>, location: u16,
) -> Array<Land> {
    let (entry, arr) = dict.entry(location.into());
    let array = arr.deref_or(array![]);
    let neighbors = array.clone();
    dict = entry.finalize(NullableTrait::new(array));
    neighbors
}

fn get_land_neighbors(mut store: Store, land_location: u16) -> Array<Land> {
    let mut lands: Array<Land> = ArrayTrait::new();

    for direction in get_directions(land_location) {
        add_land_neighbor(store, ref lands, direction);
    };

    lands
}

fn add_land_neighbor(mut store: Store, ref lands: Array<Land>, land_location: Option<u16>) {
    match land_location {
        Option::Some(location) => {
            let land = store.land(location);
            if !land.owner.is_zero() {
                lands.append(land);
            }
        },
        Option::None => {},
    }
}

fn get_auction_neighbors(mut store: Store, land_location: u16) -> Array<Auction> {
    let mut auctions: Array<Auction> = ArrayTrait::new();

    for direction in get_directions(land_location) {
        add_auction_neighbor(store, ref auctions, direction);
    };

    auctions
}

fn add_auction_neighbor(
    mut store: Store, ref auctions: Array<Auction>, land_location: Option<u16>,
) {
    match land_location {
        Option::Some(location) => {
            let auction = store.auction(location);
            if auction.is_finished && auction.sold_at_price.is_some() {
                auctions.append(auction);
            }
        },
        Option::None => {},
    }
}


fn get_average_price(mut store: Store, land_location: u16) -> u256 {
    let neighbors = get_auction_neighbors(store, land_location);

    if neighbors.len() == 0 {
        return MIN_AUCTION_PRICE;
    };

    let mut total_price = 0;
    let mut i = 0;
    while i < neighbors.len() {
        let neighbor = *neighbors[i];
        total_price += neighbor.sold_at_price.unwrap();
        i += 1;
    };
    (total_price / neighbors.len().into()) * FACTOR_FOR_SELL_PRICE.into()
}

fn get_directions(land_location: u16) -> Array<Option<u16>> {
    array![
        left(land_location),
        right(land_location),
        up(land_location),
        down(land_location),
        up_left(land_location),
        up_right(land_location),
        down_left(land_location),
        down_right(land_location),
    ]
}
