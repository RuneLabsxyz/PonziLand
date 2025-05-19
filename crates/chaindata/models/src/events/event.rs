use super::{
    actions::{
        AuctionFinishedEventModel, LandBoughtEventModel, LandNukedEventModel, NewAuctionEventModel,
    },
    auth::{AddressAuthorizedEventModel, AddressRemovedEventModel, VerifierUpdatedEventModel},
    EventId as Id, EventType,
};
use ponziland_models::events::EventData;
use sqlx::prelude::FromRow;

#[derive(FromRow, Clone, Debug)]
pub struct Event {
    pub id: Id,
    pub at: chrono::NaiveDateTime,
    pub event_type: EventType,
}

#[derive(Clone, Debug)]
pub enum DataModel {
    AuctionFinished(AuctionFinishedEventModel),
    LandBought(LandBoughtEventModel),
    LandNuked(LandNukedEventModel),
    NewAuction(NewAuctionEventModel),
    AddressAuthorized(AddressAuthorizedEventModel),
    AddressRemoved(AddressRemovedEventModel),
    VerifierUpdated(VerifierUpdatedEventModel),
}

impl DataModel {
    pub fn set_id(&mut self, id: Id) {
        match self {
            DataModel::AuctionFinished(model) => model.id = Some(id),
            DataModel::LandBought(model) => model.id = Some(id),
            DataModel::LandNuked(model) => model.id = Some(id),
            DataModel::NewAuction(model) => model.id = Some(id),
            DataModel::AddressAuthorized(model) => model.id = Some(id),
            DataModel::AddressRemoved(model) => model.id = Some(id),
            DataModel::VerifierUpdated(model) => model.id = Some(id),
        }
    }
}

impl From<EventData> for DataModel {
    fn from(data: EventData) -> Self {
        match data {
            EventData::AuctionFinished(data) => DataModel::AuctionFinished(data.into()),
            EventData::LandBought(data) => DataModel::LandBought(data.into()),
            EventData::LandNuked(data) => DataModel::LandNuked(data.into()),
            EventData::NewAuction(data) => DataModel::NewAuction(data.into()),
            EventData::AddressAuthorized(address_authorized_event) => {
                DataModel::AddressAuthorized(address_authorized_event.into())
            }
            EventData::AddressRemoved(address_removed_event) => {
                DataModel::AddressRemoved(address_removed_event.into())
            }
            EventData::VerifierUpdated(verifier_updated_event) => {
                DataModel::VerifierUpdated(verifier_updated_event.into())
            }
        }
    }
}

/// An event where the type has been fetched from the database, and is ready to use.
#[derive(Clone, Debug)]
pub struct FetchedEvent {
    pub id: Id,
    pub at: chrono::NaiveDateTime,
    pub data: DataModel,
}
