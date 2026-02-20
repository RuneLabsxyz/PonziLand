use serde::{Deserialize, Serialize};
use serde_aux::prelude::deserialize_number_from_string;
use torii_ingester::{error::ToriiConversionError, get, prelude::Struct, u256::U256};

use crate::shared::Location;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    pub land_location: Location,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub start_time: u64,
    pub start_price: U256,
    pub floor_price: U256,
    pub is_finished: bool,
    pub decay_rate: u16,
    pub sold_at_price: Option<U256>,
}

impl TryFrom<Struct> for Model {
    type Error = ToriiConversionError;

    fn try_from(entity: Struct) -> Result<Self, Self::Error> {
        Ok(Self {
            land_location: get!(entity, "land_location", Location)?,
            start_time: get!(entity, "start_time", u64)?,
            start_price: get!(entity, "start_price", U256)?,
            floor_price: get!(entity, "floor_price", U256)?,
            is_finished: get!(entity, "is_finished", bool)?,
            decay_rate: get!(entity, "decay_rate", u16)?,
            sold_at_price: get!(entity, "sold_at_price", Option<U256>)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialization_active_auction() {
        let json = r#"
        {
            "land_location": 100,
            "start_time": "1700000000",
            "start_price": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000",
            "floor_price": "0x00000000000000000000000000000000000000000000000029a2241af62c0000",
            "is_finished": false,
            "decay_rate": 100,
            "sold_at_price": null
        }
        "#;
        let auction: Model =
            serde_json::from_str(json).expect("Failed to deserialize Auction model");
        assert_eq!(auction.land_location, Location(100));
        assert_eq!(auction.start_time, 1_700_000_000);
        assert!(!auction.is_finished);
        assert_eq!(auction.decay_rate, 100);
        assert!(auction.sold_at_price.is_none());
    }

    #[test]
    fn test_deserialization_finished_auction() {
        let json = r#"
        {
            "land_location": 200,
            "start_time": "1700000000",
            "start_price": "0x0a",
            "floor_price": "0x01",
            "is_finished": true,
            "decay_rate": 50,
            "sold_at_price": "0x05"
        }
        "#;
        let auction: Model =
            serde_json::from_str(json).expect("Failed to deserialize finished Auction");
        assert!(auction.is_finished);
        assert!(auction.sold_at_price.is_some());
    }

    #[test]
    fn test_serialization_roundtrip() {
        let json = r#"
        {
            "land_location": 300,
            "start_time": "999",
            "start_price": "0x0a",
            "floor_price": "0x01",
            "is_finished": false,
            "decay_rate": 75,
            "sold_at_price": null
        }
        "#;
        let auction: Model = serde_json::from_str(json).unwrap();
        let serialized = serde_json::to_string(&auction).unwrap();
        let deserialized: Model = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.land_location, auction.land_location);
        assert_eq!(deserialized.decay_rate, auction.decay_rate);
    }
}
