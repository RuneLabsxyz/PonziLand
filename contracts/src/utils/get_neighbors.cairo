use ponzi_land::consts::{MIN_AUCTION_PRICE, FACTOR_FOR_SELL_PRICE};
use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::models::land::Land;
use ponzi_land::models::auction::Auction;
use ponzi_land::helpers::coord::{
    left, right, up, down, max_neighbors, up_left, up_right, down_left, down_right
};


fn add_neighbors(
    mut store: Store, land_location: u64, for_nuke_sell_price: bool
) -> (Array<Land>, Array<Auction>) {
    let mut lands: Array<Land> = ArrayTrait::new();
    let mut auctions: Array<Auction> = ArrayTrait::new();

    add_neighbor(store, ref lands, ref auctions, left(land_location), for_nuke_sell_price);
    add_neighbor(store, ref lands, ref auctions, right(land_location), for_nuke_sell_price);
    add_neighbor(store, ref lands, ref auctions, up(land_location), for_nuke_sell_price);
    add_neighbor(store, ref lands, ref auctions, down(land_location), for_nuke_sell_price);

    // For diagonal lands,ref auctions, we need to handle nested Options
    add_neighbor(store, ref lands, ref auctions, up_left(land_location), for_nuke_sell_price);
    add_neighbor(store, ref lands, ref auctions, up_right(land_location), for_nuke_sell_price);
    add_neighbor(store, ref lands, ref auctions, down_left(land_location), for_nuke_sell_price);
    add_neighbor(store, ref lands, ref auctions, down_right(land_location), for_nuke_sell_price);

    return (lands, auctions);
}

fn add_neighbor(
    mut store: Store,
    ref lands: Array<Land>,
    ref auctions: Array<Auction>,
    land_location: Option<u64>,
    for_nuke_sell_price: bool,
) {
    if for_nuke_sell_price {
        match land_location {
            Option::Some(location) => {
                let auction = store.auction(location);
                if auction.is_finished && auction.sold_at_price.is_some() {
                    auctions.append(auction);
                }
            },
            Option::None => {}
        }
    } else {
        match land_location {
            Option::Some(location) => {
                let land = store.land(location);
                if !land.owner.is_zero() {
                    lands.append(land);
                }
            },
            Option::None => {}
        }
    }
}

fn get_average_for_sell_price(mut store: Store, land_location: u64) -> u256 {
    let (_, neighbors) = add_neighbors(store, land_location, true);

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
