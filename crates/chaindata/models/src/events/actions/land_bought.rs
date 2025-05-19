use ponziland_models::events::actions::LandBoughtEvent;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::{
    events::EventId,
    shared::{Location, U256},
};

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct LandBoughtEventModel {
    pub id: Option<EventId>,
    pub location: Location,

    pub buyer: String,
    pub seller: String,

    pub price: U256,
    pub token_used: String,
}

impl From<LandBoughtEvent> for LandBoughtEventModel {
    fn from(event: LandBoughtEvent) -> Self {
        Self {
            id: None,
            location: event.land_location.into(),
            buyer: format!("{:#x}", event.buyer),
            seller: format!("{:#x}", event.seller),
            price: event.sold_price.into(),
            token_used: format!("{:#x}", event.token_used),
        }
    }
}
