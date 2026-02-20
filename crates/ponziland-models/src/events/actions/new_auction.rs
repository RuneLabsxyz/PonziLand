use serde::{Deserialize, Serialize};
use torii_ingester::{error::ToriiConversionError, get, prelude::Struct, u256::U256};

use crate::shared::Location;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewAuctionEvent {
    pub land_location: Location,
    pub start_price: U256,
    pub floor_price: U256,
}

impl TryFrom<Struct> for NewAuctionEvent {
    type Error = ToriiConversionError;

    fn try_from(entity: Struct) -> Result<Self, Self::Error> {
        Ok(Self {
            land_location: get!(entity, "land_location", Location)?,
            start_price: get!(entity, "start_price", U256)?,
            floor_price: get!(entity, "floor_price", U256)?,
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
            "land_location": 500,
            "start_price": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000",
            "floor_price": "0x00000000000000000000000000000000000000000000000029a2241af62c0000"
        }
        "#;
        let event: NewAuctionEvent =
            serde_json::from_str(json).expect("Failed to deserialize NewAuctionEvent");
        assert_eq!(event.land_location, Location(500));
    }

    #[test]
    fn test_serialization_roundtrip() {
        let json = r#"
        {
            "land_location": 10,
            "start_price": "0x0a",
            "floor_price": "0x01"
        }
        "#;
        let event: NewAuctionEvent = serde_json::from_str(json).unwrap();
        let serialized = serde_json::to_string(&event).unwrap();
        let deserialized: NewAuctionEvent = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.land_location, event.land_location);
    }
}
