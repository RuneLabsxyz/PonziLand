use std::fmt::Formatter;

use dojo_types::{primitive::Primitive, schema::Struct};
use dojo_world::ContractAddress;
use starknet_core::types::U256;

#[derive(Debug, Clone)]
struct Location(u64);

impl std::fmt::Display for Location {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "({}, {})", self.0 / 64, self.0 % 64)
    }
}

trait AsLocation {
    fn as_location(&self) -> Option<Location>;
}

impl AsLocation for Primitive {
    fn as_location(&self) -> Option<Location> {
        self.as_u64().map(|e| Location(e))
    }
}

trait EventPrint {
    fn pretty(&self) -> String;
}

macro_rules! get {
    ($entity: expr, $name: literal, $as: ident) => {
        $entity
            .get($name)
            .expect(&*format!("Unable to get field {}", $name))
            .as_primitive()
            .expect(&*format!("Field {} is not a primitive", $name))
            .$as()
            .expect(&*format!("Wrong conversion for {}! {:#?}", $name, $entity))
            .into()
    };
}

#[derive(Debug, Clone)]
pub struct LandNukedEvent {
    pub owner_nuked: ContractAddress,
    pub land_location: Location,
}

impl EventPrint for LandNukedEvent {
    fn pretty(&self) -> String {
        format!(
            "💥 {} owned by {:x} was nuked!",
            self.land_location, self.owner_nuked
        )
    }
}

impl From<Struct> for LandNukedEvent {
    fn from(entity: Struct) -> Self {
        Self {
            owner_nuked: get!(entity, "owner_nuked", as_contract_address),
            land_location: get!(entity, "land_location", as_location),
        }
    }
}

#[derive(Debug, Clone)]
pub struct NewAuctionEvent {
    land_location: Location,
    start_time: u64,
    start_price: U256,
    floor_price: U256,
}

impl EventPrint for NewAuctionEvent {
    fn pretty(&self) -> String {
        format!(
            "🔨 New auction for land {} starting at {} with a floor price of {}",
            self.land_location, self.start_price, self.floor_price
        )
    }
}

impl From<Struct> for NewAuctionEvent {
    fn from(entity: Struct) -> Self {
        Self {
            land_location: get!(entity, "land_location", as_location),
            start_time: get!(entity, "start_time", as_u64),
            start_price: get!(entity, "start_price", as_u256),
            floor_price: get!(entity, "floor_price", as_u256),
        }
    }
}

#[derive(Debug, Clone)]
pub struct NewLandEvent {
    pub owner_land: ContractAddress,
    pub land_location: Location,
    pub token_for_sale: ContractAddress,
    pub sell_price: U256,
}

impl EventPrint for NewLandEvent {
    fn pretty(&self) -> String {
        format!(
            "🏝️ New land {} owned by {:x} is for sale for {}",
            self.land_location, self.owner_land, self.sell_price
        )
    }
}

impl From<Struct> for NewLandEvent {
    fn from(entity: Struct) -> Self {
        Self {
            owner_land: get!(entity, "owner_land", as_contract_address),
            land_location: get!(entity, "land_location", as_location),
            token_for_sale: get!(entity, "token_for_sale", as_contract_address),
            sell_price: get!(entity, "sell_price", as_u256),
        }
    }
}

#[derive(Debug, Clone)]
pub struct RemainingStakeEvent {
    pub land_location: Location,
    pub remaining_stake: U256,
}

impl EventPrint for RemainingStakeEvent {
    fn pretty(&self) -> String {
        format!(
            "💰 Remaining stake for land {} is {}",
            self.land_location, self.remaining_stake
        )
    }
}

impl From<Struct> for RemainingStakeEvent {
    fn from(entity: Struct) -> Self {
        Self {
            land_location: get!(entity, "land_location", as_location),
            remaining_stake: get!(entity, "remaining_stake", as_u256),
        }
    }
}

#[derive(Debug, Clone)]
pub struct AuctionFinishedEvent {
    pub land_location: Location,
    pub start_time: u64,
    pub final_time: u64,
    pub final_price: U256,
}

impl EventPrint for AuctionFinishedEvent {
    fn pretty(&self) -> String {
        format!(
            "🏁 Auction for land {} started at {} and ended at {} with a final price of {}",
            self.land_location, self.start_time, self.final_time, self.final_price
        )
    }
}

impl From<Struct> for AuctionFinishedEvent {
    fn from(entity: Struct) -> Self {
        Self {
            land_location: get!(entity, "land_location", as_location),
            start_time: get!(entity, "start_time", as_u64),
            final_time: get!(entity, "final_time", as_u64),
            final_price: get!(entity, "final_price", as_u256),
        }
    }
}

#[derive(Debug, Clone)]
pub enum Event {
    AuctionFinishedEvent(AuctionFinishedEvent),
    LandNukedEvent(LandNukedEvent),
    NewLandEvent(NewLandEvent),
    RemainingStakeEvent(RemainingStakeEvent),
    NewAuctionEvent(NewAuctionEvent),
}

impl From<Struct> for Event {
    fn from(value: Struct) -> Self {
        match &*value.name {
            "ponzi_land-AuctionFinishedEvent" => {
                Event::AuctionFinishedEvent(AuctionFinishedEvent::from(value))
            }
            "ponzi_land-LandNukedEvent" => Event::LandNukedEvent(LandNukedEvent::from(value)),
            "ponzi_land-NewLandEvent" => Event::NewLandEvent(NewLandEvent::from(value)),
            "ponzi_land-RemainingStakeEvent" => {
                Event::RemainingStakeEvent(RemainingStakeEvent::from(value))
            }
            "ponzi_land-NewAuctionEvent" => Event::NewAuctionEvent(NewAuctionEvent::from(value)),
            _ => panic!("Unknown event type: {}", value.name),
        }
    }
}

impl std::fmt::Display for Event {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(&*match self {
            Event::AuctionFinishedEvent(e) => e.pretty(),
            Event::LandNukedEvent(e) => e.pretty(),
            Event::NewLandEvent(e) => e.pretty(),
            Event::RemainingStakeEvent(e) => e.pretty(),
            Event::NewAuctionEvent(e) => e.pretty(),
        })
    }
}
