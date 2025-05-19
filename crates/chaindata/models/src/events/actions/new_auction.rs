use ponziland_models::events::actions::NewAuctionEvent;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::{
    events::EventId,
    shared::{Location, U256},
};

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct NewAuctionEventModel {
    pub id: Option<EventId>,
    pub location: Location,
    pub starting_price: U256,
    pub floor_price: U256,
}

impl From<NewAuctionEvent> for NewAuctionEventModel {
    fn from(event: NewAuctionEvent) -> Self {
        Self {
            id: None,
            location: event.land_location.into(),
            starting_price: event.start_price.into(),
            floor_price: event.floor_price.into(),
        }
    }
}
