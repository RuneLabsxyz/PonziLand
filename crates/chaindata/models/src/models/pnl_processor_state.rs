use crate::events::EventId;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PnlProcessorState {
    pub id: i32,
    pub last_processed_timestamp: NaiveDateTime,
    pub last_processed_event_id: Option<EventId>,
}