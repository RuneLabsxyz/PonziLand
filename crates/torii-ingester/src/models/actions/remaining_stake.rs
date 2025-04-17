use dojo_types::schema::Struct;
use serde::{Deserialize, Serialize};

use crate::get;

use crate::models::shared::{EventPrint, Location, U256};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemainingStakeEvent {
    pub land_location: Location,
    pub remaining_stake: U256,
}

impl EventPrint for RemainingStakeEvent {
    fn pretty(&self) -> String {
        format!(
            "💰 Remaining stake for land {} is {}",
            self.land_location, self.remaining_stake
        )
    }
}

impl From<Struct> for RemainingStakeEvent {
    fn from(entity: Struct) -> Self {
        Self {
            land_location: get!(entity, "land_location", as_location),
            remaining_stake: get!(entity, "remaining_stake", as_u256),
        }
    }
}
