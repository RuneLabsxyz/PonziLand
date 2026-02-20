use serde::{Deserialize, Serialize};
use torii_ingester::{
    error::ToriiConversionError,
    get,
    prelude::{ContractAddress, Struct},
    u256::U256,
};

use crate::shared::Location;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuctionFinishedEvent {
    pub land_location: Location,
    pub buyer: ContractAddress,
    pub final_price: U256,
    pub token_used: ContractAddress,
}

impl TryFrom<Struct> for AuctionFinishedEvent {
    type Error = ToriiConversionError;

    fn try_from(entity: Struct) -> Result<Self, Self::Error> {
        Ok(Self {
            land_location: get!(entity, "land_location", Location)?,
            buyer: get!(entity, "buyer", ContractAddress)?,
            final_price: get!(entity, "final_price", U256)?,
            token_used: get!(entity, "token_used", ContractAddress)?,
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
            "land_location": 100,
            "buyer": "0x1234",
            "final_price": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000",
            "token_used": "0xabcd"
        }
        "#;
        let event: AuctionFinishedEvent =
            serde_json::from_str(json).expect("Failed to deserialize AuctionFinishedEvent");
        assert_eq!(event.land_location, Location(100));
    }

    #[test]
    fn test_serialization_roundtrip() {
        let json = r#"
        {
            "land_location": 42,
            "buyer": "0x1234",
            "final_price": "0x01",
            "token_used": "0xabcd"
        }
        "#;
        let event: AuctionFinishedEvent = serde_json::from_str(json).unwrap();
        let serialized = serde_json::to_string(&event).unwrap();
        let deserialized: AuctionFinishedEvent = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.land_location, event.land_location);
    }
}
