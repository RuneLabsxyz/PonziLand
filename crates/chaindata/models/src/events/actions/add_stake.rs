use ponziland_models::events::actions::AddStakeEvent;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::{
    events::EventId,
    shared::{Location, U256},
};

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct AddStakeEventModel {
    pub id: Option<EventId>,
    pub location: Location,
    pub new_stake_amount: U256,
    pub owner: String,
}

impl From<AddStakeEvent> for AddStakeEventModel {
    fn from(event: AddStakeEvent) -> Self {
        Self {
            id: None,
            location: event.land_location.into(),
            new_stake_amount: event.new_stake_amount.into(),
            owner: format!("{:#x}", event.owner),
        }
    }
}
