use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chaindata_repository::SimplePositionRepository;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct SimplePositionResponse {
    pub id: String,
    pub owner: String,
    pub land_location: u32,
    pub time_bought: String,
}

#[derive(Debug, Deserialize)]
pub struct SimplePositionQuery {
    #[serde(default)]
    pub limit: Option<u64>,
    #[serde(default)]
    pub offset: Option<u64>,
}

pub struct SimplePositionsRoute;

impl Default for SimplePositionsRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl SimplePositionsRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new()
            .route("/{owner}", get(Self::get_positions_by_owner))
            .route("/{owner}/count", get(Self::get_position_count))
    }

    async fn get_positions_by_owner(
        Path(owner): Path<String>,
        Query(query): Query<SimplePositionQuery>,
        State(simple_position_repository): State<Arc<SimplePositionRepository>>,
    ) -> Result<Json<Vec<SimplePositionResponse>>, axum::http::StatusCode> {
        // Convert address to lowercase for case-insensitive matching
        let owner_lowercase = owner.to_lowercase();

        let positions = simple_position_repository
            .get_by_owner(&owner_lowercase)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut responses: Vec<SimplePositionResponse> = positions
            .into_iter()
            .map(|pos| SimplePositionResponse {
                id: pos.id,
                owner: pos.owner,
                land_location: pos.land_location.0 as u32,
                time_bought: pos.time_bought.to_string(),
            })
            .collect();

        // Apply pagination
        if let Some(offset) = query.offset {
            if offset as usize >= responses.len() {
                responses.clear();
            } else {
                responses = responses.into_iter().skip(offset as usize).collect();
            }
        }

        if let Some(limit) = query.limit {
            responses.truncate(limit as usize);
        }

        Ok(Json(responses))
    }

    async fn get_position_count(
        Path(owner): Path<String>,
        State(simple_position_repository): State<Arc<SimplePositionRepository>>,
    ) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
        // Convert address to lowercase for case-insensitive matching
        let owner_lowercase = owner.to_lowercase();

        let count = simple_position_repository
            .count_by_owner(&owner_lowercase)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok(Json(serde_json::json!({
            "owner": owner,
            "total_lands_owned": count
        })))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_position_response_serialization() {
        let response = SimplePositionResponse {
            id: "test_position".to_string(),
            owner: "0x123".to_string(),
            land_location: 100,
            time_bought: "2023-01-01T00:00:00".to_string(),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("test_position"));
        assert!(json.contains("0x123"));
        assert!(json.contains("100"));
    }
}
