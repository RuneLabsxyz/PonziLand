use ponziland_models::events::actions::LandTransferEvent;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::{
    events::EventId,
    shared::{Location, U256},
};

#[derive(Clone, Debug, FromRow, Serialize, Deserialize)]
pub struct LandTransferEventModel {
    pub id: Option<EventId>,
    pub from_location: Location,
    pub to_location: Location,
    pub token_address: String,
    pub amount: U256,
}

impl From<LandTransferEvent> for LandTransferEventModel {
    fn from(event: LandTransferEvent) -> Self {
        Self {
            id: None,
            from_location: event.from_location.into(),
            to_location: event.to_location.into(),
            token_address: format!("{:#x}", event.token_address),
            amount: event.amount.into(),
        }
    }
}
