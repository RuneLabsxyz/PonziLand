use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::models::land::Land;
use ponzi_land::models::auction::Auction;
use ponzi_land::helpers::coord::{
    left, right, up, down, max_neighbors, up_left, up_right, down_left, down_right,
};
use core::nullable::{Nullable, NullableTrait, match_nullable, FromNullableResult};
use core::dict::{Felt252Dict, Felt252DictTrait, Felt252DictEntryTrait};


fn get_land_neighbors(mut store: Store, land_location: u16) -> Span<Land> {
    let mut lands: Array<Land> = ArrayTrait::new();
    let mut land_cache = LandCacheImpl::new();

    for location in get_directions(land_location) {
        match location {
            Option::Some(loc) => {
                let land = land_cache.get(loc);
                match land {
                    Option::Some(land) => { if !land.owner.is_zero() {
                        lands.append(land);
                    } },
                    Option::None => {
                        let land = store.land(loc);
                        land_cache.insert(loc, land);
                        if !land.owner.is_zero() {
                            lands.append(land);
                        }
                    },
                }
            },
            Option::None => {},
        }
    };

    lands.span()
}

#[inline(always)]
fn get_auction_neighbors(mut store: Store, land_location: u16) -> Array<Auction> {
    let mut auctions: Array<Auction> = ArrayTrait::new();

    for direction in get_directions(land_location) {
        add_auction_neighbor(store, ref auctions, direction);
    };

    auctions
}

#[inline(always)]
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
        return store.get_min_auction_price();
    };

    let mut total_price = 0;
    let mut i = 0;
    while i < neighbors.len() {
        let neighbor = *neighbors[i];
        total_price += neighbor.sold_at_price.unwrap();
        i += 1;
    };
    (total_price / neighbors.len().into()) * store.get_min_auction_price_multiplier().into()
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


#[derive(Drop, Serde)]
struct LandCache {
    locations: Array<u16>,
    lands: Array<Land>,
}

#[generate_trait]
impl LandCacheImpl of LandCacheTrait {
    fn new() -> LandCache {
        LandCache { locations: ArrayTrait::new(), lands: ArrayTrait::new() }
    }

    fn get(self: @LandCache, location: u16) -> Option<Land> {
        let len = self.locations.len();
        let mut found = false;
        let mut index = 0;
        for i in 0..len {
            if *self.locations.at(i) == location {
                found = true;
                index = i;
                break;
            }
        };

        if found {
            return Option::Some(*self.lands.at(index));
        }
        Option::None
    }

    fn insert(ref self: LandCache, location: u16, land: Land) {
        self.locations.append(location);
        self.lands.append(land);
    }
}