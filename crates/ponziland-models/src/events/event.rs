use serde_json::Value;
use torii_ingester::prelude::Struct;
use torii_ingester::{error::ToriiConversionError, RawToriiData};

use super::actions::{
    AuctionFinishedEvent, LandBoughtEvent, LandNukedEvent, LandTransferEvent, NewAuctionEvent,
};
use super::auth::{AddressAuthorizedEvent, AddressRemovedEvent, VerifierUpdatedEvent};

#[derive(Clone, Debug)]
pub enum EventData {
    AuctionFinished(AuctionFinishedEvent),
    LandBought(LandBoughtEvent),
    LandNuked(LandNukedEvent),
    NewAuction(NewAuctionEvent),
    AddressAuthorized(AddressAuthorizedEvent),
    AddressRemoved(AddressRemovedEvent),
    VerifierUpdated(VerifierUpdatedEvent),
    LandTransfer(LandTransferEvent),
}

#[derive(Clone, Debug)]
pub struct Event {
    pub at: chrono::NaiveDateTime,
    pub data: EventData,
    pub event_id: String,
}

impl Event {
    /// Parse raw Torii data into an Event.
    ///
    /// # Errors
    ///
    /// Returns an error if the raw Torii data cannot be parsed into the corresponding event.
    pub fn parse(data: RawToriiData) -> Result<Self, ToriiConversionError> {
        match data {
            RawToriiData::Json {
                name,
                data,
                at,
                event_id,
            } => {
                let event_data = EventData::from_json(&name, data)?;
                Ok(Self {
                    at: at.naive_utc(),
                    data: event_data,
                    event_id,
                })
            }
            RawToriiData::Grpc(structure) => {
                // For GRPC, we currently don't have an event_id
                // This might need to be addressed in a future update
                let event_data = EventData::try_from(structure.clone())?;
                Ok(Self {
                    at: chrono::Utc::now().naive_utc(), // Use current time for GRPC events
                    data: event_data,
                    event_id: String::new(), // Empty string for now
                })
            }
        }
    }
}

impl EventData {
    /// Create an event data from a JSON value.
    ///
    /// # Errors
    ///
    /// Returns an error if the JSON value cannot be deserialized into the corresponding event data.
    pub fn from_json(name: &str, json: Value) -> Result<Self, ToriiConversionError> {
        Ok(match name {
            "ponzi_land-AuctionFinishedEvent" => {
                EventData::AuctionFinished(serde_json::from_value(json)?)
            }
            "ponzi_land-LandBoughtEvent" => EventData::LandBought(serde_json::from_value(json)?),
            "ponzi_land-LandNukedEvent" => EventData::LandNuked(serde_json::from_value(json)?),
            "ponzi_land-NewAuctionEvent" => EventData::NewAuction(serde_json::from_value(json)?),
            "ponzi_land-AddressAuthorizedEvent" => {
                EventData::AddressAuthorized(serde_json::from_value(json)?)
            }
            "ponzi_land-AddressRemovedEvent" => {
                EventData::AddressRemoved(serde_json::from_value(json)?)
            }
            "ponzi_land-VerifierUpdatedEvent" => {
                EventData::VerifierUpdated(serde_json::from_value(json)?)
            }
            "ponzi_land-LandTransferEvent" => {
                EventData::LandTransfer(serde_json::from_value(json)?)
            }
            name => Err(ToriiConversionError::UnknownVariant {
                enum_name: "Events".to_string(),
                variant_name: name.to_string(),
            })?,
        })
    }
}

impl TryFrom<Struct> for EventData {
    type Error = ToriiConversionError;
    fn try_from(value: Struct) -> Result<Self, Self::Error> {
        Ok(match &*value.name {
            "ponzi_land-AuctionFinishedEvent" => {
                EventData::AuctionFinished(AuctionFinishedEvent::try_from(value)?)
            }
            "ponzi_land-LandBoughtEvent" => {
                EventData::LandBought(LandBoughtEvent::try_from(value)?)
            }
            "ponzi_land-LandNukedEvent" => EventData::LandNuked(LandNukedEvent::try_from(value)?),
            "ponzi_land-NewAuctionEvent" => {
                EventData::NewAuction(NewAuctionEvent::try_from(value)?)
            }
            "ponzi_land-AddressAuthorizedEvent" => {
                EventData::AddressAuthorized(AddressAuthorizedEvent::try_from(value)?)
            }
            "ponzi_land-AddressRemovedEvent" => {
                EventData::AddressRemoved(AddressRemovedEvent::try_from(value)?)
            }
            "ponzi_land-VerifierUpdatedEvent" => {
                EventData::VerifierUpdated(VerifierUpdatedEvent::try_from(value)?)
            }
            "ponzi_land-LandTransferEvent" => {
                EventData::LandTransfer(LandTransferEvent::try_from(value)?)
            }
            name => Err(ToriiConversionError::UnknownVariant {
                enum_name: "Events".to_string(),
                variant_name: name.to_string(),
            })?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_from_json_land_bought() {
        let json = json!({
            "buyer": "0x1234",
            "land_location": 2080,
            "sold_price": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000",
            "seller": "0xabcd",
            "token_used": "0x5735fa6be5dd248350866644c0a137e571f9d637bb4db6532ddd63a95854b58"
        });
        let result = EventData::from_json("ponzi_land-LandBoughtEvent", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), EventData::LandBought(_)));
    }

    #[test]
    fn test_from_json_auction_finished() {
        let json = json!({
            "land_location": 100,
            "buyer": "0x1234",
            "final_price": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000",
            "token_used": "0xabcd"
        });
        let result = EventData::from_json("ponzi_land-AuctionFinishedEvent", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), EventData::AuctionFinished(_)));
    }

    #[test]
    fn test_from_json_land_nuked() {
        let json = json!({
            "owner_nuked": "0x1234",
            "land_location": 42
        });
        let result = EventData::from_json("ponzi_land-LandNukedEvent", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), EventData::LandNuked(_)));
    }

    #[test]
    fn test_from_json_new_auction() {
        let json = json!({
            "land_location": 500,
            "start_price": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000",
            "floor_price": "0x00000000000000000000000000000000000000000000000029a2241af62c0000"
        });
        let result = EventData::from_json("ponzi_land-NewAuctionEvent", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), EventData::NewAuction(_)));
    }

    #[test]
    fn test_from_json_address_authorized() {
        let json = json!({
            "address": "0x1234",
            "authorized_at": "1000000"
        });
        let result = EventData::from_json("ponzi_land-AddressAuthorizedEvent", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), EventData::AddressAuthorized(_)));
    }

    #[test]
    fn test_from_json_address_removed() {
        let json = json!({
            "address": "0x1234",
            "authorized_at": "1000000"
        });
        let result = EventData::from_json("ponzi_land-AddressRemovedEvent", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), EventData::AddressRemoved(_)));
    }

    #[test]
    fn test_from_json_verifier_updated() {
        let json = json!({
            "new_verifier": "0x1234",
            "old_verifier": "0xabcd"
        });
        let result = EventData::from_json("ponzi_land-VerifierUpdatedEvent", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), EventData::VerifierUpdated(_)));
    }

    #[test]
    fn test_from_json_land_transfer() {
        let json = json!({
            "from_location": 100,
            "to_location": 200,
            "token_address": "0x1234",
            "amount": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000"
        });
        let result = EventData::from_json("ponzi_land-LandTransferEvent", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), EventData::LandTransfer(_)));
    }

    #[test]
    fn test_from_json_unknown_event_returns_error() {
        let json = json!({"some": "data"});
        let result = EventData::from_json("ponzi_land-UnknownEvent", json);
        assert!(result.is_err());
    }

    #[test]
    fn test_event_parse_json_variant() {
        let json = json!({
            "owner_nuked": "0x1234",
            "land_location": 42
        });
        let raw = RawToriiData::Json {
            name: "ponzi_land-LandNukedEvent".to_string(),
            data: json,
            at: chrono::Utc::now(),
            event_id: "evt_123".to_string(),
        };
        let result = Event::parse(raw);
        assert!(result.is_ok());
        let event = result.unwrap();
        assert!(matches!(event.data, EventData::LandNuked(_)));
        assert_eq!(event.event_id, "evt_123");
    }

    #[test]
    fn test_event_parse_preserves_timestamp() {
        let json = json!({
            "buyer": "0x1234",
            "land_location": 2080,
            "sold_price": "0x01",
            "seller": "0xabcd",
            "token_used": "0x5678"
        });
        let ts = chrono::DateTime::parse_from_rfc3339("2024-06-15T12:00:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc);
        let raw = RawToriiData::Json {
            name: "ponzi_land-LandBoughtEvent".to_string(),
            data: json,
            at: ts,
            event_id: "evt_456".to_string(),
        };
        let event = Event::parse(raw).unwrap();
        assert_eq!(event.at, ts.naive_utc());
    }
}
