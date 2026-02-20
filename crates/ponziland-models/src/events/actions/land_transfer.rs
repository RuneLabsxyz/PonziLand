use serde::{Deserialize, Serialize};
use torii_ingester::{
    error::ToriiConversionError,
    get,
    prelude::{ContractAddress, Struct},
    u256::U256,
};

use crate::shared::Location;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct LandTransferEvent {
    pub from_location: Location,
    pub to_location: Location,
    pub token_address: ContractAddress,
    pub amount: U256,
}

impl TryFrom<Struct> for LandTransferEvent {
    type Error = ToriiConversionError;

    fn try_from(entity: Struct) -> Result<Self, Self::Error> {
        Ok(Self {
            from_location: get!(entity, "from_location", Location)?,
            to_location: get!(entity, "to_location", Location)?,
            token_address: get!(entity, "token_address", ContractAddress)?,
            amount: get!(entity, "amount", U256)?,
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
            "from_location": 100,
            "to_location": 200,
            "token_address": "0x1234",
            "amount": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000"
        }
        "#;
        let event: LandTransferEvent =
            serde_json::from_str(json).expect("Failed to deserialize LandTransferEvent");
        assert_eq!(event.from_location, Location(100));
        assert_eq!(event.to_location, Location(200));
    }

    #[test]
    fn test_serialization_roundtrip() {
        let json = r#"
        {
            "from_location": 50,
            "to_location": 75,
            "token_address": "0xabcd",
            "amount": "0x01"
        }
        "#;
        let event: LandTransferEvent = serde_json::from_str(json).unwrap();
        let serialized = serde_json::to_string(&event).unwrap();
        let deserialized: LandTransferEvent = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.from_location, event.from_location);
        assert_eq!(deserialized.to_location, event.to_location);
    }
}
