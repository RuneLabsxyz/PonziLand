use chrono::{DateTime, Utc};
use serde_json::Value;
use torii_ingester::{error::ToriiConversionError, prelude::Struct, RawToriiData};

use crate::models::{Land, LandStake};

use super::Auction;

/// Represents a parsed model with additional metadata
pub struct ParsedModel {
    pub model: Model,
    pub timestamp: Option<DateTime<Utc>>,
    pub event_id: Option<String>,
}

pub enum Model {
    Land(Land),
    LandStake(LandStake),
    Auction(Auction),
}

impl TryFrom<Struct> for Model {
    type Error = ToriiConversionError;
    fn try_from(value: Struct) -> Result<Self, Self::Error> {
        Ok(match &*value.name {
            "ponzi_land-Land" => Model::Land(Land::try_from(value)?),
            "ponzi_land-LandStake" => Model::LandStake(LandStake::try_from(value)?),
            "ponzi_land-Auction" => Model::Auction(Auction::try_from(value)?),
            name => Err(ToriiConversionError::UnknownVariant {
                enum_name: "Models".to_string(),
                variant_name: name.to_string(),
            })?,
        })
    }
}

impl Model {
    /// Create a model from a JSON value.
    ///
    /// # Errors
    ///
    /// Returns an error if the JSON value cannot be deserialized into the corresponding model.
    pub fn from_json(name: &str, json: Value) -> Result<Self, ToriiConversionError> {
        Ok(match name {
            "ponzi_land-Land" => Model::Land(serde_json::from_value(json)?),
            "ponzi_land-LandStake" => Model::LandStake(serde_json::from_value(json)?),
            "ponzi_land-Auction" => Model::Auction(serde_json::from_value(json)?),
            name => Err(ToriiConversionError::UnknownVariant {
                enum_name: "Models".to_string(),
                variant_name: name.to_string(),
            })?,
        })
    }

    /// Create a model from a raw Torii data.
    ///
    /// # Errors
    ///
    /// Returns an error if the raw Torii data cannot be parsed into the corresponding model.
    pub fn parse(data: RawToriiData) -> Result<ParsedModel, ToriiConversionError> {
        Ok(match data {
            RawToriiData::Json {
                name,
                data,
                at,
                event_id,
            } => ParsedModel {
                model: Self::from_json(&name, data)?,
                timestamp: Some(at),
                event_id: Some(event_id),
            },
            RawToriiData::Grpc(data) => ParsedModel {
                model: Self::try_from(data)?,
                timestamp: None,
                event_id: None,
            },
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_from_json_land_model() {
        let json = json!({
            "block_date_bought": "0",
            "level": {"Zero": []},
            "location": 2080,
            "owner": "0x0",
            "sell_price": "0x000000000000000000000000000000000000000000000006f05b59d3b2000000",
            "token_used": "0x5735fa6be5dd248350866644c0a137e571f9d637bb4db6532ddd63a95854b58"
        });
        let result = Model::from_json("ponzi_land-Land", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), Model::Land(_)));
    }

    #[test]
    fn test_from_json_land_stake_model() {
        let json = json!({
            "location": 1,
            "amount": "0x01",
            "neighbors_info_packed": "29608056480889981"
        });
        let result = Model::from_json("ponzi_land-LandStake", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), Model::LandStake(_)));
    }

    #[test]
    fn test_from_json_auction_model() {
        let json = json!({
            "land_location": 100,
            "start_time": "1700000000",
            "start_price": "0x0000000000000000000000000000000000000000000000056bc75e2d63100000",
            "floor_price": "0x00000000000000000000000000000000000000000000000029a2241af62c0000",
            "is_finished": false,
            "decay_rate": 100,
            "sold_at_price": null
        });
        let result = Model::from_json("ponzi_land-Auction", json);
        assert!(result.is_ok());
        assert!(matches!(result.unwrap(), Model::Auction(_)));
    }

    #[test]
    fn test_from_json_unknown_model_returns_error() {
        let json = json!({"some": "data"});
        let result = Model::from_json("ponzi_land-Unknown", json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_json_raw_data() {
        let json = json!({
            "block_date_bought": "0",
            "level": {"Zero": []},
            "location": 2080,
            "owner": "0x0",
            "sell_price": "0x01",
            "token_used": "0x5678"
        });
        let ts = chrono::Utc::now();
        let raw = RawToriiData::Json {
            name: "ponzi_land-Land".to_string(),
            data: json,
            at: ts,
            event_id: "model_evt_1".to_string(),
        };
        let result = Model::parse(raw);
        assert!(result.is_ok());
        let parsed = result.unwrap();
        assert!(matches!(parsed.model, Model::Land(_)));
        assert_eq!(parsed.timestamp, Some(ts));
        assert_eq!(parsed.event_id, Some("model_evt_1".to_string()));
    }

    #[test]
    fn test_parse_unknown_model_returns_error() {
        let json = json!({"data": "test"});
        let raw = RawToriiData::Json {
            name: "ponzi_land-DoesNotExist".to_string(),
            data: json,
            at: chrono::Utc::now(),
            event_id: "evt_1".to_string(),
        };
        let result = Model::parse(raw);
        assert!(result.is_err());
    }
}
