use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use chaindata_repository::MessagesRepository;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::state::AppState;

/// Special address used for global chat messages
pub const GLOBAL_CHAT_ADDRESS: &str = "global";

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub sender: String,
    pub recipient: String,
    pub content: String,
    // TODO: Add signature fields for proper auth
    // pub timestamp: i64,
    // pub signature_r: String,
    // pub signature_s: String,
}

#[derive(Debug, Serialize)]
pub struct SendMessageResponse {
    pub id: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct GetMessagesQuery {
    pub address: String,       // The requesting user's address
    pub with: String,          // The conversation partner's address
    pub after: Option<String>, // ISO 8601 timestamp
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct GetMessagesResponse {
    pub messages: Vec<MessageResponse>,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: String,
    pub sender: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct GetConversationsQuery {
    pub address: String, // The requesting user's address
}

#[derive(Debug, Deserialize)]
pub struct GetGlobalMessagesQuery {
    pub after: Option<String>, // ISO 8601 timestamp
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct GetConversationsResponse {
    pub conversations: Vec<ConversationResponse>,
}

#[derive(Debug, Serialize)]
pub struct ConversationResponse {
    pub with_address: String,
    pub last_message: String,
    pub last_message_at: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

pub struct MessagesRoute;

impl Default for MessagesRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl MessagesRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new()
            .route("/", post(Self::send_message))
            .route("/", get(Self::get_messages))
            .route("/conversations", get(Self::get_conversations))
            .route("/global", get(Self::get_global_messages))
    }

    async fn send_message(
        State(messages_repository): State<Arc<MessagesRepository>>,
        Json(request): Json<SendMessageRequest>,
    ) -> Result<Json<SendMessageResponse>, (StatusCode, Json<ErrorResponse>)> {
        // Validate content is not empty
        if request.content.trim().is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Message content cannot be empty".to_string(),
                }),
            ));
        }

        // Validate content length (max 2000 chars)
        if request.content.len() > 2000 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "Message content too long (max 2000 characters)".to_string(),
                }),
            ));
        }

        // TODO: Verify Starknet signature here
        // For MVP, we trust the sender field
        // In production, derive sender from verified signature

        let message = messages_repository
            .insert_message(&request.sender, &request.recipient, &request.content)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to send message: {e}"),
                    }),
                )
            })?;

        Ok(Json(SendMessageResponse {
            id: message.id.to_string(),
            created_at: message.created_at.to_rfc3339(),
        }))
    }

    async fn get_messages(
        State(messages_repository): State<Arc<MessagesRepository>>,
        Query(query): Query<GetMessagesQuery>,
    ) -> Result<Json<GetMessagesResponse>, (StatusCode, Json<ErrorResponse>)> {
        // TODO: Verify Starknet signature here
        // For MVP, we trust the address field

        let after = query
            .after
            .as_ref()
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));

        let limit = query.limit.unwrap_or(50).min(100);

        let messages = messages_repository
            .get_conversation(&query.address, &query.with, after, limit)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to get messages: {e}"),
                    }),
                )
            })?;

        let responses: Vec<MessageResponse> = messages
            .into_iter()
            .map(|m| MessageResponse {
                id: m.id.to_string(),
                sender: m.sender,
                content: m.content,
                created_at: m.created_at.to_rfc3339(),
            })
            .collect();

        Ok(Json(GetMessagesResponse {
            messages: responses,
        }))
    }

    async fn get_conversations(
        State(messages_repository): State<Arc<MessagesRepository>>,
        Query(query): Query<GetConversationsQuery>,
    ) -> Result<Json<GetConversationsResponse>, (StatusCode, Json<ErrorResponse>)> {
        // TODO: Verify Starknet signature here
        // For MVP, we trust the address field

        let conversations = messages_repository
            .get_conversations(&query.address)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to get conversations: {e}"),
                    }),
                )
            })?;

        let responses: Vec<ConversationResponse> = conversations
            .into_iter()
            .map(|c| ConversationResponse {
                with_address: c.with_address,
                last_message: c.last_message,
                last_message_at: c.last_message_at.to_rfc3339(),
            })
            .collect();

        Ok(Json(GetConversationsResponse {
            conversations: responses,
        }))
    }

    async fn get_global_messages(
        State(messages_repository): State<Arc<MessagesRepository>>,
        Query(query): Query<GetGlobalMessagesQuery>,
    ) -> Result<Json<GetMessagesResponse>, (StatusCode, Json<ErrorResponse>)> {
        let after = query
            .after
            .as_ref()
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));

        let limit = query.limit.unwrap_or(100).min(200);

        let messages = messages_repository
            .get_global_messages(after, limit)
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to get global messages: {e}"),
                    }),
                )
            })?;

        let responses: Vec<MessageResponse> = messages
            .into_iter()
            .map(|m| MessageResponse {
                id: m.id.to_string(),
                sender: m.sender,
                content: m.content,
                created_at: m.created_at.to_rfc3339(),
            })
            .collect();

        Ok(Json(GetMessagesResponse {
            messages: responses,
        }))
    }
}
