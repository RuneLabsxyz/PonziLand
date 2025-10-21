use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use torii_ingester::prelude::ContractAddress;
use crate::shared::Location;

/// Simple position tracking land ownership history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimplePosition {
    /// Unique identifier: owner_land_timestamp
    pub id: String,
    /// Wallet address of the owner (hex format)
    pub owner: String,
    /// Land location on the map
    pub land_location: Location,
    /// When this land was bought
    pub time_bought: NaiveDateTime,
}

impl SimplePosition {
    /// Create a new position from a land purchase
    pub fn new(
        owner: ContractAddress,
        land_location: Location,
        time_bought: NaiveDateTime,
    ) -> Self {
        let owner_hex = format!("{:#x}", owner);
        let id = format!(
            "{}_{}_{}",
            owner_hex,
            land_location,
            time_bought.and_utc().timestamp()
        );

        Self {
            id,
            owner: owner_hex,
            land_location,
            time_bought,
        }
    }
}