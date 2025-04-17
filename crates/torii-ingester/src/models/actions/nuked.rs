use dojo_types::schema::Struct;
use dojo_world::ContractAddress;
use serde::{Deserialize, Serialize};

use crate::get;

use crate::models::shared::{EventPrint, Location};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandNukedEvent {
    pub owner_nuked: ContractAddress,
    pub land_location: Location,
}

impl EventPrint for LandNukedEvent {
    fn pretty(&self) -> String {
        format!(
            "💥 {} owned by {:x} was nuked!",
            self.land_location, self.owner_nuked
        )
    }
}

impl From<Struct> for LandNukedEvent {
    fn from(entity: Struct) -> Self {
        Self {
            owner_nuked: get!(entity, "owner_nuked", as_contract_address),
            land_location: get!(entity, "land_location", as_location),
        }
    }
}
