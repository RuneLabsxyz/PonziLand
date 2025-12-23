use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct MessageModel {
    pub id: Uuid,
    pub sender: String,
    pub recipient: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub context_type: Option<String>,
    pub context_id: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ConversationSummary {
    pub with_address: String,
    pub last_message: String,
    pub last_message_at: DateTime<Utc>,
}
