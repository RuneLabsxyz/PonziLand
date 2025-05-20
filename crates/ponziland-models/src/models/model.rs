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
