use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::utils::get_neighbors::{get_average_price};

#[inline(always)]
pub fn get_suggested_sell_price(store: Store, land_location: u16) -> u256 {
    let min_auction_price = store.get_min_auction_price();
    let avg_price = get_average_price(store, land_location);
    if avg_price > min_auction_price {
        avg_price
    } else {
        min_auction_price
    }
}

#[inline(always)]
pub fn get_sell_price_for_new_auction_from_bid(store: Store, sold_at_price: u256) -> u256 {
    let min_auction_price = store.get_min_auction_price();
    let asking_price = sold_at_price * store.get_min_auction_price_multiplier().into();
    let asking_price = if asking_price > min_auction_price {
        sold_at_price
    } else {
        min_auction_price
    };
    asking_price
}
