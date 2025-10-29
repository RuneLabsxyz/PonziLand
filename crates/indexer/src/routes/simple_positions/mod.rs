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
    pub close_date: Option<String>,
    pub close_reason: Option<String>,
    pub buy_cost_token: Option<String>,
    pub buy_cost_usd: Option<String>,
    pub buy_token_used: Option<String>,
    pub sale_revenue_token: Option<String>,
    pub sale_revenue_usd: Option<String>,
    pub sale_token_used: Option<String>,
    pub net_profit_token: Option<String>,
    pub net_profit_usd: Option<String>,
    pub token_inflows: serde_json::Value,
    pub token_outflows: serde_json::Value,
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
            .map(|pos| {
                // Calculate net profit if both buy cost and sale revenue are available
                let net_profit_token = match (&pos.buy_cost_token, &pos.sale_revenue_token) {
                    (Some(buy_cost), Some(sale_revenue)) => {
                        // Dereference three times: chaindata::U256 -> torii::U256 -> starknet::U256
                        if ***sale_revenue >= ***buy_cost {
                            // Profit case: sale_revenue - buy_cost
                            let result = ***sale_revenue - ***buy_cost;
                            Some(result.to_string())
                        } else {
                            // Loss case: prepend minus sign
                            let result = ***buy_cost - ***sale_revenue;
                            Some(format!("-{}", result))
                        }
                    }
                    _ => None,
                };

                let net_profit_usd = match (&pos.buy_cost_usd, &pos.sale_revenue_usd) {
                    (Some(buy_cost), Some(sale_revenue)) => {
                        // Dereference three times: chaindata::U256 -> torii::U256 -> starknet::U256
                        if ***sale_revenue >= ***buy_cost {
                            // Profit case: sale_revenue - buy_cost
                            let result = ***sale_revenue - ***buy_cost;
                            Some(result.to_string())
                        } else {
                            // Loss case: prepend minus sign
                            let result = ***buy_cost - ***sale_revenue;
                            Some(format!("-{}", result))
                        }
                    }
                    _ => None,
                };

                SimplePositionResponse {
                    id: pos.id,
                    owner: pos.owner,
                    land_location: pos.land_location.0 as u32,
                    time_bought: pos.time_bought.to_string(),
                    close_date: pos.close_date.map(|d| d.to_string()),
                    close_reason: pos.close_reason,
                    buy_cost_token: pos.buy_cost_token.map(|d| d.to_string()),
                    buy_cost_usd: pos.buy_cost_usd.map(|d| d.to_string()),
                    buy_token_used: pos.buy_token_used,
                    sale_revenue_token: pos.sale_revenue_token.map(|d| d.to_string()),
                    sale_revenue_usd: pos.sale_revenue_usd.map(|d| d.to_string()),
                    sale_token_used: pos.sale_token_used,
                    net_profit_token,
                    net_profit_usd,
                    token_inflows: serde_json::to_value(&pos.token_inflows.0)
                        .unwrap_or(serde_json::json!({})),
                    token_outflows: serde_json::to_value(&pos.token_outflows.0)
                        .unwrap_or(serde_json::json!({})),
                }
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
            close_date: Some("2023-01-02T00:00:00".to_string()),
            close_reason: Some("bought".to_string()),
            buy_cost_token: Some("1000000000000000000".to_string()),
            buy_cost_usd: Some("1500.50".to_string()),
            buy_token_used: Some(
                "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7".to_string(),
            ),
            sale_revenue_token: Some("2000000000000000000".to_string()),
            sale_revenue_usd: Some("3000.75".to_string()),
            sale_token_used: Some(
                "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7".to_string(),
            ),
            net_profit_token: Some("1000000000000000000".to_string()),
            net_profit_usd: Some("1500.25".to_string()),
            token_inflows: serde_json::json!({}),
            token_outflows: serde_json::json!({}),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("test_position"));
        assert!(json.contains("0x123"));
        assert!(json.contains("100"));
        assert!(json.contains("2023-01-02T00:00:00"));
        assert!(json.contains("bought"));
        assert!(json.contains("1000000000000000000"));
        assert!(json.contains("1500.50"));
        assert!(json.contains("3000.75"));
        assert!(json.contains("1500.25"));
        assert!(json.contains("token_inflows"));
        assert!(json.contains("token_outflows"));
    }
}
