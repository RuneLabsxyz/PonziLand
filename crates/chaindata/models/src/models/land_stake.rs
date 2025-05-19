use chrono::NaiveDateTime;
use ponziland_models::models::LandStake;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::{
    events::EventId,
    shared::{Location, U256},
    utils::date::naive_from_u64,
};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Model {
    pub id: EventId,
    pub at: NaiveDateTime,
    pub location: Location,
    pub last_pay_time: NaiveDateTime,
    pub amount: U256,
}

impl Model {
    #[must_use]
    pub fn from_at(land: &LandStake, id: EventId, at: NaiveDateTime) -> Self {
        Self {
            id,
            at,
            location: land.location.into(),
            last_pay_time: naive_from_u64(land.last_pay_time),
            amount: land.amount.into(),
        }
    }
}
