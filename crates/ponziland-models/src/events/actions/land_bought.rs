use serde::{Deserialize, Serialize};
use torii_ingester::{
    error::ToriiConversionError,
    get,
    prelude::{ContractAddress, Struct},
    u256::U256,
};

use crate::shared::Location;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandBoughtEvent {
    pub buyer: ContractAddress,
    pub land_location: Location,

    pub sold_price: U256,
    pub seller: ContractAddress,
    pub token_used: ContractAddress,
}

impl TryFrom<Struct> for LandBoughtEvent {
    type Error = ToriiConversionError;

    fn try_from(entity: Struct) -> Result<Self, Self::Error> {
        Ok(Self {
            buyer: get!(entity, "buyer", ContractAddress)?,
            land_location: get!(entity, "land_location", Location)?,

            sold_price: get!(entity, "sold_price", U256)?,
            seller: get!(entity, "seller", ContractAddress)?,
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
            "buyer": "0x1234",
            "land_location": 2080,
            "sold_price": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000",
            "seller": "0xabcd",
            "token_used": "0x5735fa6be5dd248350866644c0a137e571f9d637bb4db6532ddd63a95854b58"
        }
        "#;
        let event: LandBoughtEvent =
            serde_json::from_str(json).expect("Failed to deserialize LandBoughtEvent");
        assert_eq!(event.land_location, Location(2080));
    }

    #[test]
    fn test_serialization_roundtrip() {
        let json = r#"
        {
            "buyer": "0x1234",
            "land_location": 100,
            "sold_price": "0x01",
            "seller": "0xabcd",
            "token_used": "0x5678"
        }
        "#;
        let event: LandBoughtEvent = serde_json::from_str(json).unwrap();
        let serialized = serde_json::to_string(&event).unwrap();
        let deserialized: LandBoughtEvent = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.land_location, event.land_location);
    }
}
