use dojo_types::schema::Struct;
use serde::{Deserialize, Serialize};

use crate::get;

use crate::models::shared::{EventPrint, Location, U256};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewAuctionEvent {
    land_location: Location,
    start_time: u64,
    start_price: U256,
    floor_price: U256,
}

impl EventPrint for NewAuctionEvent {
    fn pretty(&self) -> String {
        format!(
            "🔨 New auction for land {} starting at {} with a floor price of {}",
            self.land_location, self.start_price, self.floor_price
        )
    }
}

impl From<Struct> for NewAuctionEvent {
    fn from(entity: Struct) -> Self {
        Self {
            land_location: get!(entity, "land_location", as_location),
            start_time: get!(entity, "start_time", as_u64),
            start_price: get!(entity, "start_price", as_u256),
            floor_price: get!(entity, "floor_price", as_u256),
        }
    }
}
