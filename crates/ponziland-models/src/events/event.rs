use serde_json::Value;
use torii_ingester::prelude::Struct;
use torii_ingester::{error::ToriiConversionError, RawToriiData};

use super::actions::{
    AddStakeEvent, AuctionFinishedEvent, LandBoughtEvent, LandNukedEvent, LandTransferEvent,
    NewAuctionEvent,
};
use super::auth::{AddressAuthorizedEvent, AddressRemovedEvent, VerifierUpdatedEvent};

#[derive(Clone, Debug)]
pub enum EventData {
    AddStake(AddStakeEvent),
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
            "ponzi_land-AddStakeEvent" => EventData::AddStake(serde_json::from_value(json)?),
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
            "ponzi_land-AddStakeEvent" => {
                EventData::AddStake(AddStakeEvent::try_from(value)?)
            }
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
