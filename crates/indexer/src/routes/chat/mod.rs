use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use chaindata_repository::{chat::GLOBAL_CHANNEL_ID, ChatRepository};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    service::chat_moderation::{self, RateLimitConfig},
    state::AppState,
};

// ── Request / Response types ──────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub sender_address: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct GetMessagesQuery {
    pub limit: Option<i64>,
    pub before: Option<String>, // ISO 8601 timestamp
}

#[derive(Debug, Deserialize)]
pub struct DmSendRequest {
    pub sender_address: String,
    pub recipient_address: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct DmListQuery {
    pub user_address: String,
}

#[derive(Debug, Deserialize)]
pub struct DmMessagesQuery {
    pub user_address: String,
    pub peer_address: String,
    pub limit: Option<i64>,
    pub before: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: String,
    pub channel_id: String,
    pub sender_address: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct DmChannelResponse {
    pub channel_id: String,
    pub peer_address: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

// ── Route setup ───────────────────────────────────────────────

pub struct ChatRoute;

impl Default for ChatRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl ChatRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new()
            // Global chat
            .route("/global/messages", get(Self::get_global_messages))
            .route("/global/send", post(Self::send_global_message))
            // DMs
            .route("/dm/send", post(Self::send_dm))
            .route("/dm/channels", get(Self::list_dm_channels))
            .route("/dm/messages", get(Self::get_dm_messages))
    }

    // ── Global chat ───────────────────────────────────────────

    async fn get_global_messages(
        Query(query): Query<GetMessagesQuery>,
        State(chat_repo): State<Arc<ChatRepository>>,
    ) -> Result<Json<Vec<MessageResponse>>, (StatusCode, Json<ErrorResponse>)> {
        let limit = query.limit.unwrap_or(50).min(100);
        let before = query
            .before
            .as_deref()
            .and_then(|s| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.fZ").ok())
            .or_else(|| {
                query.before.as_deref().and_then(|s| {
                    chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S").ok()
                })
            });

        let messages = chat_repo
            .get_messages(GLOBAL_CHANNEL_ID, limit, before)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to fetch messages: {e}"),
                    }),
                )
            })?;

        Ok(Json(messages.into_iter().map(Into::into).collect()))
    }

    async fn send_global_message(
        State(chat_repo): State<Arc<ChatRepository>>,
        Json(req): Json<SendMessageRequest>,
    ) -> Result<Json<MessageResponse>, (StatusCode, Json<ErrorResponse>)> {
        Self::send_message_to_channel(
            &chat_repo,
            GLOBAL_CHANNEL_ID,
            &req.sender_address,
            &req.content,
        )
        .await
    }

    // ── DMs ───────────────────────────────────────────────────

    async fn send_dm(
        State(chat_repo): State<Arc<ChatRepository>>,
        Json(req): Json<DmSendRequest>,
    ) -> Result<Json<MessageResponse>, (StatusCode, Json<ErrorResponse>)> {
        if req.sender_address == req.recipient_address {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Cannot send DM to yourself".to_string(),
                }),
            ));
        }

        let channel = chat_repo
            .get_or_create_dm_channel(&req.sender_address, &req.recipient_address)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to get/create DM channel: {e}"),
                    }),
                )
            })?;

        Self::send_message_to_channel(&chat_repo, channel.id, &req.sender_address, &req.content)
            .await
    }

    async fn list_dm_channels(
        Query(query): Query<DmListQuery>,
        State(chat_repo): State<Arc<ChatRepository>>,
    ) -> Result<Json<Vec<DmChannelResponse>>, (StatusCode, Json<ErrorResponse>)> {
        let channels = chat_repo
            .list_dm_channels(&query.user_address)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to list DM channels: {e}"),
                    }),
                )
            })?;

        let mut result = Vec::with_capacity(channels.len());
        for channel in channels {
            let peer = chat_repo
                .get_dm_peer(channel.id, &query.user_address)
                .await
                .map_err(|e| {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ErrorResponse {
                            error: format!("Failed to get DM peer: {e}"),
                        }),
                    )
                })?
                .unwrap_or_default();

            result.push(DmChannelResponse {
                channel_id: channel.id.to_string(),
                peer_address: peer,
                created_at: channel.created_at.to_string(),
            });
        }

        Ok(Json(result))
    }

    async fn get_dm_messages(
        Query(query): Query<DmMessagesQuery>,
        State(chat_repo): State<Arc<ChatRepository>>,
    ) -> Result<Json<Vec<MessageResponse>>, (StatusCode, Json<ErrorResponse>)> {
        let channel = chat_repo
            .find_dm_channel(&query.user_address, &query.peer_address)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to find DM channel: {e}"),
                    }),
                )
            })?;

        let Some(channel) = channel else {
            return Ok(Json(vec![]));
        };

        let limit = query.limit.unwrap_or(50).min(100);
        let before = query
            .before
            .and_then(|s| chrono::NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S%.fZ").ok());

        let messages = chat_repo
            .get_messages(channel.id, limit, before)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to fetch DM messages: {e}"),
                    }),
                )
            })?;

        Ok(Json(messages.into_iter().map(Into::into).collect()))
    }

    // ── Shared helpers ────────────────────────────────────────

    async fn send_message_to_channel(
        chat_repo: &ChatRepository,
        channel_id: Uuid,
        sender_address: &str,
        content: &str,
    ) -> Result<Json<MessageResponse>, (StatusCode, Json<ErrorResponse>)> {
        // 1. Validate content
        if let Err(reason) = chat_moderation::validate_message(content) {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: reason.to_string(),
                }),
            ));
        }

        // 2. Check ban
        let is_banned = chat_repo
            .is_user_banned(sender_address)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to check ban status: {e}"),
                    }),
                )
            })?;

        if is_banned {
            return Err((
                StatusCode::FORBIDDEN,
                Json(ErrorResponse {
                    error: "You are banned from chat".to_string(),
                }),
            ));
        }

        // 3. Rate limit
        let rate_config = RateLimitConfig::default();
        let recent_count = chat_repo
            .count_recent_messages(sender_address, rate_config.window_seconds)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to check rate limit: {e}"),
                    }),
                )
            })?;

        if recent_count >= rate_config.max_messages {
            return Err((
                StatusCode::TOO_MANY_REQUESTS,
                Json(ErrorResponse {
                    error: "Rate limit exceeded. Please wait before sending more messages."
                        .to_string(),
                }),
            ));
        }

        // 4. Insert message
        let trimmed = content.trim();
        let msg_id = chat_repo
            .insert_message(channel_id, sender_address, trimmed)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to send message: {e}"),
                    }),
                )
            })?;

        Ok(Json(MessageResponse {
            id: msg_id.to_string(),
            channel_id: channel_id.to_string(),
            sender_address: sender_address.to_string(),
            content: trimmed.to_string(),
            created_at: chrono::Utc::now().naive_utc().to_string(),
        }))
    }
}

// ── Conversions ───────────────────────────────────────────────

impl From<chaindata_models::models::ChatMessageModel> for MessageResponse {
    fn from(m: chaindata_models::models::ChatMessageModel) -> Self {
        Self {
            id: m.id.to_string(),
            channel_id: m.channel_id.to_string(),
            sender_address: m.sender_address,
            content: m.content,
            created_at: m.created_at.to_string(),
        }
    }
}
