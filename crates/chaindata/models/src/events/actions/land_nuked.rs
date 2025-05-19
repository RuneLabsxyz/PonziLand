use ponziland_models::events::actions::LandNukedEvent;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::{events::EventId, shared::Location};

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct LandNukedEventModel {
    pub id: Option<EventId>,
    pub location: Location,
    pub owner: String,
}

impl From<LandNukedEvent> for LandNukedEventModel {
    fn from(event: LandNukedEvent) -> Self {
        Self {
            id: None,
            location: event.land_location.into(),
            owner: format!("{:#x}", event.owner_nuked),
        }
    }
}
