use chrono::NaiveDateTime;
use ponziland_models::models::SimplePosition;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

use crate::shared::Location;

#[derive(Clone, Debug, FromRow, Serialize, Deserialize)]
pub struct SimplePositionModel {
    pub id: String,
    pub at: NaiveDateTime,
    pub owner: String,
    pub land_location: Location,
    pub time_bought: NaiveDateTime,
}

impl SimplePositionModel {
    /// Create a new SimplePositionModel from a SimplePosition
    pub fn from_simple_position(position: &SimplePosition, at: NaiveDateTime) -> Self {
        Self {
            id: position.id.clone(),
            at,
            owner: position.owner.clone(),
            land_location: Location::from(position.land_location),
            time_bought: position.time_bought,
        }
    }

    /// Convert this model back to a SimplePosition
    pub fn to_simple_position(&self) -> SimplePosition {
        SimplePosition {
            id: self.id.clone(),
            owner: self.owner.clone(),
            land_location: (*self.land_location).into(),
            time_bought: self.time_bought,
        }
    }
}