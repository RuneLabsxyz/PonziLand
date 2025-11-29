use serde::{Deserialize, Serialize};

use super::EventDataModel;

#[derive(Clone, Debug, PartialEq, PartialOrd, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "event_type")]
pub enum EventType {
    #[sqlx(rename = "ponzi_land-AddStakeEvent")]
    AddStake,
    #[sqlx(rename = "ponzi_land-AuctionFinishedEvent")]
    AuctionFinished,
    #[sqlx(rename = "ponzi_land-LandBoughtEvent")]
    LandBought,
    #[sqlx(rename = "ponzi_land-LandNukedEvent")]
    LandNuked,
    #[sqlx(rename = "ponzi_land-NewAuctionEvent")]
    NewAuction,
    #[sqlx(rename = "ponzi_land-AddressAuthorizedEvent")]
    AddressAuthorized,
    #[sqlx(rename = "ponzi_land-AddressRemovedEvent")]
    AddressRemoved,
    #[sqlx(rename = "ponzi_land-VerifierUpdatedEvent")]
    VerifierUpdated,
    #[sqlx(rename = "ponzi_land-LandTransferEvent")]
    LandTransfer,
}

impl From<&EventDataModel> for EventType {
    fn from(value: &EventDataModel) -> Self {
        match value {
            EventDataModel::AddStake(_) => EventType::AddStake,
            EventDataModel::AuctionFinished(_) => EventType::AuctionFinished,
            EventDataModel::LandBought(_) => EventType::LandBought,
            EventDataModel::LandNuked(_) => EventType::LandNuked,
            EventDataModel::NewAuction(_) => EventType::NewAuction,
            EventDataModel::AddressAuthorized(_) => EventType::AddressAuthorized,
            EventDataModel::AddressRemoved(_) => EventType::AddressRemoved,
            EventDataModel::VerifierUpdated(_) => EventType::VerifierUpdated,
            EventDataModel::LandTransfer(_) => EventType::LandTransfer,
        }
    }
}
