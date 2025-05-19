use crate::events::EventId;
use crate::shared::{Location, U256};
use crate::utils::date::naive_from_u64;
use chrono::NaiveDateTime;
use ponziland_models::models::{Land, Level as RawLevel};
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;
use sqlx::Type;
// Unfortunately, we need to re-declare level to have the iterop with the database working with sqlx.
// Importing the sqlx crate in the external ponziland-models one seems ridiculous, and prevents usage from external users.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Copy, Type)]
#[repr(i32)]
pub enum Level {
    Zero = 0,
    First = 1,
    Second = 2,
}

impl From<RawLevel> for Level {
    fn from(level: RawLevel) -> Self {
        match level {
            RawLevel::Zero => Level::Zero,
            RawLevel::First => Level::First,
            RawLevel::Second => Level::Second,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Model {
    pub id: EventId,
    pub at: NaiveDateTime,
    pub location: Location,
    pub bought_at: NaiveDateTime,
    pub owner: String,
    pub sell_price: U256,
    pub token_used: String,
    pub level: Level,
}

impl Model {
    #[must_use]
    pub fn from_at(land: &Land, id: EventId, at: NaiveDateTime) -> Self {
        Self {
            id,
            at,
            location: land.location.into(),
            bought_at: naive_from_u64(land.block_date_bought),
            owner: land.owner.to_string(),
            sell_price: land.sell_price.into(),
            token_used: land.token_used.to_string(),
            level: land.level.into(),
        }
    }
}
