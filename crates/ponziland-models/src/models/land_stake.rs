use serde::{Deserialize, Serialize};
use serde_aux::prelude::deserialize_number_from_string;
use torii_ingester::{error::ToriiConversionError, get, prelude::Struct, u256::U256};

use crate::shared::Location;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandStake {
    pub location: Location,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub amount: U256,
    #[serde(deserialize_with = "deserialize_number_from_string")]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_neighbors_info_deserialization() {
        let json = r#"
        {
            "location": 1,
            "amount": "0x01",
            "neighbors_info_packed": "29608056480889981"
        }
        "#;

        let stake: LandStake =
            serde_json::from_str(json).expect("Failed to deserialize LandStake model");
        assert_eq!(stake.neighbors_info_packed, 29_608_056_480_889_981_u128);
    }
}
