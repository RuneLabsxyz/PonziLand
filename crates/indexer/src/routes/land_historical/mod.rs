use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chaindata_repository::LandHistoricalRepository;
use chrono::{Duration, Utc};
use ponziland_models::models::CloseReason;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

use crate::state::AppState;

fn deserialize_optional_datetime<'de, D>(
    deserializer: D,
) -> Result<Option<chrono::NaiveDateTime>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::Deserialize;

    let opt: Option<String> = Option::deserialize(deserializer)?;
    match opt {
        None => Ok(None),
        Some(s) => chrono::NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S")
            .or_else(|_| chrono::DateTime::parse_from_rfc3339(&s).map(|dt| dt.naive_utc()))
            .map(Some)
            .map_err(serde::de::Error::custom),
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct LandHistoricalResponse {
    pub id: String,
    pub owner: String,
    pub land_location: u32,
    pub time_bought: String,
    pub close_date: Option<String>,
    pub close_reason: Option<CloseReason>,
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
pub struct LandHistoricalQuery {
    #[serde(default)]
    pub limit: Option<u64>,
    #[serde(default)]
    pub offset: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct LeaderboardQuery {
    /// Number of days to look back (default: 7). Ignored if `since` is provided.
    #[serde(default = "default_days")]
    pub days: u32,
    /// ISO 8601 timestamp to filter from (e.g., "2024-12-01T00:00:00" or "2024-12-01T00:00:00Z").
    /// If provided, `days` is ignored. Useful for tournaments with a specific start time.
    #[serde(default, deserialize_with = "deserialize_optional_datetime")]
    pub since: Option<chrono::NaiveDateTime>,
    /// ISO 8601 timestamp to filter until (e.g., "2024-12-15T00:00:00").
    /// If not provided, no upper bound is applied. Useful for spectator mode replay.
    #[serde(default, deserialize_with = "deserialize_optional_datetime")]
    pub until: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct SnapshotQuery {
    /// ISO 8601 timestamp for the snapshot point (e.g., "2024-12-01T00:00:00").
    /// Returns all lands that were owned at this specific moment.
    #[serde(deserialize_with = "deserialize_datetime")]
    pub at: chrono::NaiveDateTime,
}

fn deserialize_datetime<'de, D>(deserializer: D) -> Result<chrono::NaiveDateTime, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::Deserialize;

    let s: String = String::deserialize(deserializer)?;
    chrono::NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S")
        .or_else(|_| chrono::DateTime::parse_from_rfc3339(&s).map(|dt| dt.naive_utc()))
        .map_err(serde::de::Error::custom)
}

fn default_days() -> u32 {
    7
}

#[derive(Debug, Clone, Serialize)]
pub struct LeaderboardEntry {
    pub owner: String,
    pub total_positions: u32,
    pub positions: Vec<LandHistoricalResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LeaderboardResponse {
    pub entries: Vec<LeaderboardEntry>,
    /// The timestamp from which positions were queried
    pub since: String,
    /// The timestamp until which positions were queried (if specified)
    pub until: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SnapshotResponse {
    /// The timestamp at which the snapshot was taken
    pub at: String,
    /// All lands that were owned at the snapshot time
    pub lands: Vec<LandHistoricalResponse>,
}

pub struct LandHistoricalRoute;

impl Default for LandHistoricalRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl LandHistoricalRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new()
            .route("/leaderboard", get(Self::get_leaderboard))
            .route("/snapshot", get(Self::get_snapshot))
            .route("/{owner}", get(Self::get_positions_by_owner))
            .route("/{owner}/count", get(Self::get_position_count))
    }

    async fn get_positions_by_owner(
        Path(owner): Path<String>,
        Query(query): Query<LandHistoricalQuery>,
        State(land_historical_repository): State<Arc<LandHistoricalRepository>>,
    ) -> Result<Json<Vec<LandHistoricalResponse>>, axum::http::StatusCode> {
        // Convert address to lowercase for case-insensitive matching
        let owner_lowercase = owner.to_lowercase();

        let positions = land_historical_repository
            .get_by_owner(&owner_lowercase)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut responses: Vec<LandHistoricalResponse> = positions
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

                LandHistoricalResponse {
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
        State(land_historical_repository): State<Arc<LandHistoricalRepository>>,
    ) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
        // Convert address to lowercase for case-insensitive matching
        let owner_lowercase = owner.to_lowercase();

        let count = land_historical_repository
            .count_by_owner(&owner_lowercase)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok(Json(serde_json::json!({
            "owner": owner,
            "total_lands_owned": count
        })))
    }

    async fn get_leaderboard(
        Query(query): Query<LeaderboardQuery>,
        State(land_historical_repository): State<Arc<LandHistoricalRepository>>,
    ) -> Result<Json<LeaderboardResponse>, axum::http::StatusCode> {
        // Determine the "since" timestamp: use explicit `since` param if provided, otherwise calculate from `days`
        let since = match query.since {
            Some(dt) => dt,
            None => Utc::now()
                .naive_utc()
                .checked_sub_signed(Duration::days(i64::from(query.days)))
                .ok_or(axum::http::StatusCode::BAD_REQUEST)?,
        };

        // Fetch all closed positions in the time range
        let positions = land_historical_repository
            .get_closed_positions_between(since, query.until)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        // Group positions by owner
        let mut grouped: HashMap<String, Vec<LandHistoricalResponse>> = HashMap::new();

        for pos in positions {
            // Calculate net profit if both buy cost and sale revenue are available
            let net_profit_token = match (&pos.buy_cost_token, &pos.sale_revenue_token) {
                (Some(buy_cost), Some(sale_revenue)) => {
                    if ***sale_revenue >= ***buy_cost {
                        let result = ***sale_revenue - ***buy_cost;
                        Some(result.to_string())
                    } else {
                        let result = ***buy_cost - ***sale_revenue;
                        Some(format!("-{}", result))
                    }
                }
                _ => None,
            };

            let net_profit_usd = match (&pos.buy_cost_usd, &pos.sale_revenue_usd) {
                (Some(buy_cost), Some(sale_revenue)) => {
                    if ***sale_revenue >= ***buy_cost {
                        let result = ***sale_revenue - ***buy_cost;
                        Some(result.to_string())
                    } else {
                        let result = ***buy_cost - ***sale_revenue;
                        Some(format!("-{}", result))
                    }
                }
                _ => None,
            };

            let response = LandHistoricalResponse {
                id: pos.id,
                owner: pos.owner.clone(),
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
            };

            grouped.entry(pos.owner.clone()).or_default().push(response);
        }

        // Convert to LeaderboardEntry list
        let entries: Vec<LeaderboardEntry> = grouped
            .into_iter()
            .map(|(owner, positions)| LeaderboardEntry {
                owner,
                total_positions: positions.len() as u32,
                positions,
            })
            .collect();

        Ok(Json(LeaderboardResponse {
            entries,
            since: since.to_string(),
            until: query.until.map(|dt| dt.to_string()),
        }))
    }

    async fn get_snapshot(
        Query(query): Query<SnapshotQuery>,
        State(land_historical_repository): State<Arc<LandHistoricalRepository>>,
    ) -> Result<Json<SnapshotResponse>, axum::http::StatusCode> {
        // Fetch all positions that were active at the given timestamp
        let positions = land_historical_repository
            .get_snapshot_at(query.at)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        // Convert to response format
        let lands: Vec<LandHistoricalResponse> = positions
            .into_iter()
            .map(|pos| {
                // Calculate net profit if both buy cost and sale revenue are available
                let net_profit_token = match (&pos.buy_cost_token, &pos.sale_revenue_token) {
                    (Some(buy_cost), Some(sale_revenue)) => {
                        if ***sale_revenue >= ***buy_cost {
                            let result = ***sale_revenue - ***buy_cost;
                            Some(result.to_string())
                        } else {
                            let result = ***buy_cost - ***sale_revenue;
                            Some(format!("-{}", result))
                        }
                    }
                    _ => None,
                };

                let net_profit_usd = match (&pos.buy_cost_usd, &pos.sale_revenue_usd) {
                    (Some(buy_cost), Some(sale_revenue)) => {
                        if ***sale_revenue >= ***buy_cost {
                            let result = ***sale_revenue - ***buy_cost;
                            Some(result.to_string())
                        } else {
                            let result = ***buy_cost - ***sale_revenue;
                            Some(format!("-{}", result))
                        }
                    }
                    _ => None,
                };

                LandHistoricalResponse {
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

        Ok(Json(SnapshotResponse {
            at: query.at.to_string(),
            lands,
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_position_response_serialization() {
        let response = LandHistoricalResponse {
            id: "test_position".to_string(),
            owner: "0x123".to_string(),
            land_location: 100,
            time_bought: "2023-01-01T00:00:00".to_string(),
            close_date: Some("2023-01-02T00:00:00".to_string()),
            close_reason: Some(CloseReason::Bought),
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
