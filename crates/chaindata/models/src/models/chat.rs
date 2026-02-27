use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "chat_channel_type", rename_all = "lowercase")]
pub enum ChatChannelType {
    Global,
    Dm,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ChatChannelModel {
    pub id: Uuid,
    pub channel_type: ChatChannelType,
    pub name: Option<String>,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ChatChannelParticipantModel {
    pub id: i32,
    pub channel_id: Uuid,
    pub user_address: String,
    pub joined_at: NaiveDateTime,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ChatMessageModel {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub sender_address: String,
    pub content: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ChatBanModel {
    pub id: i32,
    pub user_address: String,
    pub reason: Option<String>,
    pub banned_at: NaiveDateTime,
    pub expires_at: Option<NaiveDateTime>,
}
