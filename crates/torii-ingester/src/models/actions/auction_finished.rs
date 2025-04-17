use dojo_types::schema::Struct;
use dojo_world::ContractAddress;

use crate::get;

use crate::models::shared::{EventPrint, Location, U256};

#[derive(Debug, Clone)]
pub struct AuctionFinishedEvent {
    pub land_location: Location,
    pub buyer: ContractAddress,
    pub start_time: u64,
    pub final_time: u64,
    pub final_price: U256,
}

impl EventPrint for AuctionFinishedEvent {
    fn pretty(&self) -> String {
        format!(
            "🏁 Auction for land {} started at {} and ended at {} with a final price of {}, bought by {}",
            self.land_location, self.start_time, self.final_time, self.final_price, self.buyer
        )
    }
}

impl From<Struct> for AuctionFinishedEvent {
    fn from(entity: Struct) -> Self {
        Self {
            land_location: get!(entity, "land_location", as_location),
            buyer: get!(entity, "buyer", as_contract_address),
            start_time: get!(entity, "start_time", as_u64),
            final_time: get!(entity, "final_time", as_u64),
            final_price: get!(entity, "final_price", as_u256),
        }
    }
}
