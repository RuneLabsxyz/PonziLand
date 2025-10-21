//TODO:see if we want to move this another folder like pnl or something
use crate::events::EventId;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PositionEventLog {
    pub log_id: i32,
    pub position_id: i32,
    pub event_type: String,
    pub event_data: Value, // JSONB
    pub timestamp: NaiveDateTime,
    pub blockchain_event_id: EventId,
}