use ponziland_models::events::actions::AuctionFinishedEvent;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::{
    events::EventId,
    shared::{Location, U256},
};

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AuctionFinishedEventModel {
    pub id: Option<EventId>,
    pub location: Location,
    pub buyer: String,
    pub price: U256,
}

impl From<AuctionFinishedEvent> for AuctionFinishedEventModel {
    fn from(event: AuctionFinishedEvent) -> Self {
        Self {
            id: None,
            location: event.land_location.into(),
            buyer: format!("{:#x}", event.buyer),
            price: event.final_price.into(),
        }
    }
}
