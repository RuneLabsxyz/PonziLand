use serde::{Deserialize, Serialize};
use torii_ingester::{
    error::ToriiConversionError,
    get,
    prelude::{ContractAddress, Struct},
};

use crate::shared::Location;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandNukedEvent {
    pub owner_nuked: ContractAddress,
    pub land_location: Location,
}

impl TryFrom<Struct> for LandNukedEvent {
    type Error = ToriiConversionError;

    fn try_from(entity: Struct) -> Result<Self, Self::Error> {
        Ok(Self {
            owner_nuked: get!(entity, "owner_nuked", ContractAddress)?,
            land_location: get!(entity, "land_location", Location)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialization() {
        let json = r#"
        {
            "owner_nuked": "0x1234",
            "land_location": 42
        }
        "#;
        let event: LandNukedEvent =
            serde_json::from_str(json).expect("Failed to deserialize LandNukedEvent");
        assert_eq!(event.land_location, Location(42));
    }

    #[test]
    fn test_serialization_roundtrip() {
        let json = r#"
        {
            "owner_nuked": "0xdead",
            "land_location": 999
        }
        "#;
        let event: LandNukedEvent = serde_json::from_str(json).unwrap();
        let serialized = serde_json::to_string(&event).unwrap();
        let deserialized: LandNukedEvent = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.land_location, event.land_location);
    }
}
