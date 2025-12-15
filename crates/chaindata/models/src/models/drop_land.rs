use chrono::NaiveDateTime;
use sqlx::types::Json;
use std::collections::HashMap;

use crate::shared::{Location, U256};

/// Query result model for drop lands with all calculated metrics
/// This represents a land location that was bought by a reinjector, with all metrics
/// calculated at query time (not persisted to database)
#[derive(Clone, Debug)]
pub struct DropLandModel {
    pub land_location: Location,
    pub owner: String,
    pub token_address: String,
    pub time_bought: NaiveDateTime,
    pub drop_initial_stake: U256,
    pub drop_remaining_stake: U256,
    pub drop_distributed_total: U256,
    pub token_inflows: Json<HashMap<String, U256>>,
    pub token_inflows_usd: u64,
    pub area_protocol_fees_total: Json<HashMap<String, U256>>,
    pub area_protocol_fees_usd: u64,
    pub sale_protocol_fees_total: Json<HashMap<String, U256>>,
    pub sale_protocol_fees_usd: u64,
    pub influenced_auctions_total: U256,
    pub drop_roi: f64,
    pub close_date: Option<NaiveDateTime>,
    pub is_active: bool,
}

/// Aggregated metrics for all drops owned by a reinjector
#[derive(Clone, Debug)]
pub struct GlobalDropMetricsModel {
    pub area_fees_per_token: Json<HashMap<String, U256>>,
    pub distributed_per_token: Json<HashMap<String, U256>>,
    pub inflows_per_token: Json<HashMap<String, U256>>,
    pub sale_fees_per_token: Json<HashMap<String, U256>>,
    pub total_distributed: U256,
    pub total_influenced_auctions: U256,
}
