use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chaindata_repository::SimplePositionRepository;
use bigdecimal::BigDecimal;
use std::str::FromStr;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct LandTransactionData {
    pub buy_cost_token: Option<String>,
    pub buy_cost_usd: Option<String>,
    pub buy_token_used: Option<String>,
    pub sale_revenue_token: Option<String>,
    pub sale_revenue_usd: Option<String>,
    pub sale_token_used: Option<String>,
    pub net_profit_land: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TokenFlowData {
    pub inflows: HashMap<String, String>,
    pub outflows: HashMap<String, String>,
    pub net_profit_flows: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SimplePositionResponse {
    pub id: String,
    pub owner: String,
    pub land_location: u32,
    pub time_bought: String,
    pub close_date: Option<String>,
    pub close_reason: Option<String>,
    pub land_transaction: LandTransactionData,
    pub token_flows: TokenFlowData,
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

    /// Parse JSON token flows to HashMap<String, String>
    fn parse_token_flows(json_value: &serde_json::Value) -> HashMap<String, String> {
        match json_value.as_object() {
            Some(obj) => obj
                .iter()
                .filter_map(|(k, v)| {
                    v.as_str().map(|s| (k.clone(), s.to_string()))
                })
                .collect(),
            None => HashMap::new(),
        }
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
                // Parse token flows from JSON
                let inflows = Self::parse_token_flows(&pos.token_inflows);
                let outflows = Self::parse_token_flows(&pos.token_outflows);
                
                // Calculate net profit for land transaction
                let net_profit_land = match (&pos.buy_cost_token, &pos.sale_revenue_token) {
                    (Some(buy_cost), Some(sale_revenue)) => {
                        Some((sale_revenue - buy_cost).to_string())
                    }
                    _ => None,
                };

                // Calculate net profits for token flows
                let mut net_profit_flows = HashMap::new();
                let all_tokens: std::collections::HashSet<String> = inflows.keys()
                    .chain(outflows.keys())
                    .cloned()
                    .collect();
                
                for token in all_tokens {
                    let inflow_amount = inflows.get(&token).and_then(|s| BigDecimal::from_str(s).ok()).unwrap_or_else(|| BigDecimal::from(0));
                    let outflow_amount = outflows.get(&token).and_then(|s| BigDecimal::from_str(s).ok()).unwrap_or_else(|| BigDecimal::from(0));
                    let net_profit = inflow_amount - outflow_amount;
                    net_profit_flows.insert(token, net_profit.to_string());
                }

                SimplePositionResponse {
                    id: pos.id,
                    owner: pos.owner,
                    land_location: pos.land_location.0 as u32,
                    time_bought: pos.time_bought.to_string(),
                    close_date: pos.close_date.map(|d| d.to_string()),
                    close_reason: pos.close_reason,
                    land_transaction: LandTransactionData {
                        buy_cost_token: pos.buy_cost_token.map(|d| d.to_string()),
                        buy_cost_usd: pos.buy_cost_usd.map(|d| d.to_string()),
                        buy_token_used: pos.buy_token_used,
                        sale_revenue_token: pos.sale_revenue_token.map(|d| d.to_string()),
                        sale_revenue_usd: pos.sale_revenue_usd.map(|d| d.to_string()),
                        sale_token_used: pos.sale_token_used,
                        net_profit_land,
                    },
                    token_flows: TokenFlowData {
                        inflows,
                        outflows,
                        net_profit_flows,
                    },
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
        let mut token_inflows = HashMap::new();
        token_inflows.insert("0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7".to_string(), "500000000000000000".to_string());
        
        let mut token_outflows = HashMap::new();
        token_outflows.insert("0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7".to_string(), "100000000000000000".to_string());
        
        let mut net_profit_flows = HashMap::new();
        net_profit_flows.insert("0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7".to_string(), "400000000000000000".to_string());

        let response = SimplePositionResponse {
            id: "test_position".to_string(),
            owner: "0x123".to_string(),
            land_location: 100,
            time_bought: "2023-01-01T00:00:00".to_string(),
            close_date: Some("2023-01-02T00:00:00".to_string()),
            close_reason: Some("bought".to_string()),
            land_transaction: LandTransactionData {
                buy_cost_token: Some("1000000000000000000".to_string()),
                buy_cost_usd: Some("1500.50".to_string()),
                buy_token_used: Some("0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7".to_string()),
                sale_revenue_token: Some("2000000000000000000".to_string()),
                sale_revenue_usd: Some("3000.75".to_string()),
                sale_token_used: Some("0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7".to_string()),
                net_profit_land: Some("1000000000000000000".to_string()),
            },
            token_flows: TokenFlowData {
                inflows: token_inflows,
                outflows: token_outflows,
                net_profit_flows,
            },
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
        assert!(json.contains("land_transaction"));
        assert!(json.contains("token_flows"));
        assert!(json.contains("inflows"));
        assert!(json.contains("outflows"));
        assert!(json.contains("500000000000000000"));
        assert!(json.contains("400000000000000000"));
    }
}
