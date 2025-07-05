use serde::{Deserialize, Serialize};
use serde_aux::prelude::deserialize_number_from_string;
use torii_ingester::{error::ToriiConversionError, get, prelude::Struct, u256::U256};

use crate::shared::Location;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandStake {
    pub location: Location,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub amount: U256,
    pub neighbors_info_packed: u128,
}

impl TryFrom<Struct> for LandStake {
    type Error = ToriiConversionError;

    fn try_from(entity: Struct) -> Result<Self, Self::Error> {
        Ok(Self {
            location: get!(entity, "location", Location)?,
            amount: get!(entity, "amount", U256)?,
            neighbors_info_packed: get!(entity, "neighbors_info_packed", u128)?,
        })
    }
}
