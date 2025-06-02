use crate::utils::date::naive_from_u64;
use chrono::NaiveDateTime;
use ponziland_models::models::LandStake;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::{
    events::EventId,
    shared::{Location, U256},
};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Model {
    pub id: EventId,
    pub at: NaiveDateTime,
    pub location: Location,
    pub amount: U256,
    pub earliest_claim_neighbor_time: NaiveDateTime,
    pub earliest_claim_neighbor_location: Location,
    pub num_active_neighbors: i16,
}

impl Model {
    #[must_use]
    pub fn from_at(land: &LandStake, id: EventId, at: NaiveDateTime) -> Self {
        let (earliest_claim_neighbor_time, num_active_neighbors, earliest_claim_neighbor_location) =
            unpack_neighbors_info(land.neighbors_info_packed);
        Self {
            id,
            at,
            location: land.location.into(),
            amount: land.amount.into(),
            earliest_claim_neighbor_time: naive_from_u64(earliest_claim_neighbor_time),
            earliest_claim_neighbor_location: earliest_claim_neighbor_location.into(),
            num_active_neighbors: num_active_neighbors.into(),
        }
    }
}

fn unpack_neighbors_info(packed: u128) -> (u64, i16, Location) {
    let location = (packed & 0xFFFF) as u16;
    let neighbors = ((packed >> 16) & 0xFF) as i16;
    let time = (packed >> 24) as u64;
    let location = Location::from(location as u64);
    (time, neighbors, location)
}
