use crate::events::EventId;
use crate::shared::{Location, U256};
use crate::utils::date::naive_from_u64;
use chrono::NaiveDateTime;
use ponziland_models::models::Auction;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuctionModel {
    pub id: EventId,
    pub at: NaiveDateTime,
    pub location: Location,
    pub start_time: NaiveDateTime,
    pub start_price: U256,
    pub floor_price: U256,
    pub is_finished: bool,
    pub decay_rate: i16,
    pub sold_at_price: Option<U256>,
}

impl AuctionModel {
    #[must_use]
    #[allow(clippy::cast_possible_wrap)]
    pub fn from_at(auction: &Auction, id: EventId, at: NaiveDateTime) -> Self {
        Self {
            id,
            at,
            location: auction.land_location.into(),
            start_time: naive_from_u64(auction.start_time),
            start_price: auction.start_price.into(),
            floor_price: auction.floor_price.into(),
            is_finished: auction.is_finished,
            decay_rate: auction.decay_rate as i16,
            sold_at_price: auction.sold_at_price.map(Into::into),
        }
    }
}
