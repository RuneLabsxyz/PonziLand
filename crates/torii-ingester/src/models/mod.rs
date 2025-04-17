use std::fmt::Formatter;

use actions::{
    AuctionFinishedEvent, LandBoughtEvent, LandNukedEvent, NewAuctionEvent, RemainingStakeEvent,
};
use auth::{AddressAuthorizedEvent, AddressRemovedEvent, VerifierUpdatedEvent};
use dojo_types::schema::Struct;
use shared::EventPrint;

pub mod actions;

pub mod auth;
pub mod shared;

#[derive(Debug, Clone)]
pub enum Event {
    AuctionFinished(AuctionFinishedEvent),
    LandBought(LandBoughtEvent),
    LandNuked(LandNukedEvent),
    NewAuction(NewAuctionEvent),
    RemainingStake(RemainingStakeEvent),

    AddressAuthorized(AddressAuthorizedEvent),
    AddressRemoved(AddressRemovedEvent),
    VerifierUpdated(VerifierUpdatedEvent),
}

// TODO: Migrate this to try_from
impl From<Struct> for Event {
    fn from(value: Struct) -> Self {
        match &*value.name {
            "ponzi_land-AuctionFinishedEvent" => {
                Event::AuctionFinished(AuctionFinishedEvent::from(value))
            }
            "ponzi_land-LandBoughtEvent" => Event::LandBought(LandBoughtEvent::from(value)),
            "ponzi_land-LandNukedEvent" => Event::LandNuked(LandNukedEvent::from(value)),
            "ponzi_land-NewAuctionEvent" => Event::NewAuction(NewAuctionEvent::from(value)),
            "ponzi_land-RemainingStakeEvent" => {
                Event::RemainingStake(RemainingStakeEvent::from(value))
            }
            "ponzi_land-AddressAuthorizedEvent" => {
                Event::AddressAuthorized(AddressAuthorizedEvent::from(value))
            }
            "ponzi_land-AddressRemovedEvent" => {
                Event::AddressRemoved(AddressRemovedEvent::from(value))
            }
            "ponzi_land-VerifierUpdatedEvent" => {
                Event::VerifierUpdated(VerifierUpdatedEvent::from(value))
            }
            _ => panic!("Unknown event type"),
        }
    }
}

impl std::fmt::Display for Event {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let str = match self {
            Event::LandNuked(e) => e.pretty(),
            Event::AuctionFinished(e) => e.pretty(),
            Event::LandBought(e) => e.pretty(),
            Event::NewAuction(e) => e.pretty(),
            Event::RemainingStake(e) => e.pretty(),
            Event::AddressAuthorized(e) => e.pretty(),
            Event::AddressRemoved(e) => e.pretty(),
            Event::VerifierUpdated(e) => e.pretty(),
        };

        f.write_str(&str)
    }
}
