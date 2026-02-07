use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chaindata_repository::{DropLandQueriesRepository, LandHistoricalRepository};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

use crate::service::{avnu::AvnuService, ekubo::EkuboService, token::TokenService};
use crate::state::AppState;
use crate::utils::normalize_token_address;

const USDC_SYMBOL: &str = "USDC";

// === Response types for /emitted endpoint (from main) ===

#[derive(Debug, Clone, Serialize)]
pub struct TokenInfo {
    pub symbol: Option<String>,
    pub amount: String,
    pub usd: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DropsEmittedResponse {
    pub total_usd: f64,
    pub tokens: HashMap<String, TokenInfo>,
    pub positions_count: u64,
    pub tracked_wallets: Vec<String>,
}

// === Response types for drop metrics endpoints (from feature branch) ===

#[derive(Debug, Clone, Serialize)]
pub struct DropLandResponse {
    pub land_location: u32,
    pub owner: String,
    pub time_bought: String,
    pub stake_token: String,
    pub drop_initial_stake: String,
    pub drop_remaining_stake: String,
    pub drop_distributed_total: String,
    pub token_inflows: serde_json::Value,
    pub token_inflows_usd: Option<String>,
    pub area_protocol_fees_total: serde_json::Value,
    pub area_protocol_fees_total_usd: Option<String>,
    pub sale_protocol_fees_total: serde_json::Value,
    pub sale_protocol_fees_total_usd: Option<String>,
    pub influenced_auctions_total: String,
    pub drop_roi: f64,
    pub close_date: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GlobalDropMetricsResponse {
    pub total_revenue: String,
    pub total_sale_fees: String,
    pub total_drops_distributed: String,
    pub total_token_inflows: String,
    pub total_influenced_auctions: String,
    pub global_roi: f64,
    pub since: String,
    pub until: String,
    pub per_token: Vec<GlobalTokenMetricsResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GlobalTokenMetricsResponse {
    pub token: String,
    pub fees: String,
    pub sale_fees: String,
    pub distributed: String,
    pub inflows: String,
}

#[derive(Debug, Deserialize)]
pub struct GlobalMetricsQuery {
    #[serde(default)]
    pub since: Option<String>, // ISO 8601 timestamp
    #[serde(default)]
    pub until: Option<String>, // ISO 8601 timestamp
    #[serde(default)]
    pub fee_rate_basis_points: Option<String>, // Parse as string then convert to u128
    #[serde(default)]
    pub sale_fee_basis_points: Option<String>, // Parse as string then convert to u128
    #[serde(default = "default_level")]
    pub level: u8, // Neighbor level (1-3)
}

#[derive(Debug, Deserialize)]
pub struct DropListQuery {
    #[serde(default)]
    pub since: Option<String>, // ISO 8601 timestamp
    #[serde(default)]
    pub until: Option<String>, // ISO 8601 timestamp
    #[serde(default)]
    pub location: Option<u32>, // Land location (0-65535)
    #[serde(default = "default_level")]
    pub level: u8, // Neighbor level (1-3)
    #[serde(default)]
    pub fee_rate_basis_points: Option<String>, // Parse as string then convert to u128
    #[serde(default)]
    pub sale_fee_basis_points: Option<String>, // Parse as string then convert to u128
}

fn default_level() -> u8 {
    1
}

pub struct DropsRoute;

impl Default for DropsRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl DropsRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new()
            // Main's endpoint
            .route("/emitted", get(Self::get_drops_emitted))
            // Feature branch endpoints
            .route("/{reinjector}/lands", get(Self::get_drop_lands))
            .route(
                "/{reinjector}/global-metrics",
                get(Self::get_global_metrics),
            )
    }

    // === Handler from main: /drops/emitted ===

    async fn get_drops_emitted(
        State(land_historical_repository): State<Arc<LandHistoricalRepository>>,
        State(avnu_service): State<Arc<AvnuService>>,
        State(ekubo_service): State<Arc<EkuboService>>,
        State(token_service): State<Arc<TokenService>>,
        State(drop_emitter_wallets): State<Arc<Vec<String>>>,
    ) -> Result<Json<DropsEmittedResponse>, axum::http::StatusCode> {
        // Convert configured wallets to lowercase for case-insensitive matching
        let wallets: Vec<String> = drop_emitter_wallets
            .iter()
            .map(|w| w.to_lowercase())
            .collect();

        // Fetch all positions for tracked wallets
        let positions = land_historical_repository
            .get_by_owners(&wallets)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut aggregated_outflows: HashMap<String, starknet::core::types::U256> = HashMap::new();

        for position in &positions {
            for (token_address, amount) in &position.token_outflows.0 {
                let entry = aggregated_outflows
                    .entry(token_address.clone())
                    .or_insert(starknet::core::types::U256::from(0u128));
                *entry += ***amount;
            }
        }

        let usdc_ratio = get_usdc_ratio(&token_service, &avnu_service, &ekubo_service);

        // Build token address to symbol lookup map
        let token_symbols: HashMap<String, String> = token_service
            .list()
            .into_iter()
            .map(|t| (t.address.to_fixed_hex_string(), t.symbol))
            .collect();

        // Convert to USD and build response
        let mut total_usd = 0.0_f64;
        let mut tokens: HashMap<String, TokenInfo> = HashMap::new();

        for (token_address, amount) in &aggregated_outflows {
            let normalized_address = normalize_token_address(token_address);

            // Get token symbol
            let symbol = token_symbols.get(&normalized_address).cloned();

            // Get token price and convert to USD
            let token_ratio: Option<f64> = avnu_service
                .get_price_of(&normalized_address)
                .map(|info| info.ratio.0.into())
                .or_else(|| {
                    ekubo_service
                        .get_price_of(&normalized_address)
                        .map(|info| info.ratio.0.into())
                });

            let decimals = token_service.get_decimals(&normalized_address);

            let usd_value = if let (Some(token_ratio), Some(usdc)) = (token_ratio, usdc_ratio) {
                // Calculate USD value
                // usdc ratio is already in USD form (1 STRK = Y USD)
                // token_ratio is "1 STRK = X tokens"
                // So 1 token = (usdc / token_ratio) USD
                if token_ratio > 0.0 {
                    let usd_per_token = usdc / token_ratio;
                    let amount_f64 = u256_to_f64_with_decimals(amount, decimals);
                    let usd = amount_f64 * usd_per_token;
                    total_usd += usd;
                    Some(usd)
                } else {
                    None
                }
            } else {
                None
            };

            tokens.insert(
                token_address.clone(),
                TokenInfo {
                    symbol,
                    amount: amount.to_string(),
                    usd: usd_value,
                },
            );
        }

        Ok(Json(DropsEmittedResponse {
            total_usd,
            tokens,
            positions_count: positions.len() as u64,
            tracked_wallets: wallets,
        }))
    }

    // === Handlers from feature branch ===

    /// Get all drop lands for a reinjector address with full metrics
    /// GET /drops/{reinjector}/lands?since=...&until=...&location=...&level=...&fee_rate_basis_points=...
    async fn get_drop_lands(
        Path(reinjector): Path<String>,
        Query(query): Query<DropListQuery>,
        State(repo): State<Arc<DropLandQueriesRepository>>,
    ) -> Result<Json<Vec<DropLandResponse>>, axum::http::StatusCode> {
        let reinjector_lowercase = reinjector.to_lowercase();
        let fee_rate = query
            .fee_rate_basis_points
            .as_ref()
            .and_then(|s| s.parse::<u128>().ok())
            .unwrap_or(250_000);
        let sale_fee_rate = query
            .sale_fee_basis_points
            .as_ref()
            .and_then(|s| s.parse::<u128>().ok())
            .unwrap_or(500_000);

        // Parse timestamps from ISO 8601 format if provided
        let since = query.since.as_ref().and_then(|s| {
            DateTime::parse_from_rfc3339(s)
                .ok()
                .map(|dt| dt.with_timezone(&Utc).naive_utc())
        });

        let until = query.until.as_ref().and_then(|u| {
            DateTime::parse_from_rfc3339(u)
                .ok()
                .map(|dt| dt.with_timezone(&Utc).naive_utc())
        });

        let drops = repo
            .get_drop_lands(
                &reinjector_lowercase,
                since,
                until,
                query.level,
                fee_rate,
                sale_fee_rate,
            )
            .await
            .map_err(|e| {
                println!("❌ [ERROR] Failed to fetch drops: {:?}", e);
                axum::http::StatusCode::INTERNAL_SERVER_ERROR
            })?;

        let responses: Vec<DropLandResponse> = drops
            .into_iter()
            .filter(|drop| {
                if let Some(loc) = query.location {
                    drop.land_location.0 as u32 == loc
                } else {
                    true
                }
            })
            .map(|drop| DropLandResponse {
                land_location: drop.land_location.0 as u32,
                owner: drop.owner,
                time_bought: DateTime::<Utc>::from_naive_utc_and_offset(drop.time_bought, Utc)
                    .to_rfc3339(),
                stake_token: drop.token_address,
                drop_initial_stake: drop.drop_initial_stake.to_string(),
                drop_remaining_stake: drop.drop_remaining_stake.to_string(),
                drop_distributed_total: drop.drop_distributed_total.to_string(),
                token_inflows: serde_json::to_value(&drop.token_inflows.0)
                    .unwrap_or(serde_json::json!({})),
                token_inflows_usd: None,
                area_protocol_fees_total: serde_json::to_value(&drop.area_protocol_fees_total.0)
                    .unwrap_or(serde_json::json!({})),
                area_protocol_fees_total_usd: None,
                sale_protocol_fees_total: serde_json::to_value(&drop.sale_protocol_fees_total.0)
                    .unwrap_or(serde_json::json!({})),
                sale_protocol_fees_total_usd: None,
                influenced_auctions_total: drop.influenced_auctions_total.to_string(),
                drop_roi: drop.drop_roi,
                close_date: drop
                    .close_date
                    .map(|d| DateTime::<Utc>::from_naive_utc_and_offset(d, Utc).to_rfc3339()),
                is_active: drop.is_active,
            })
            .collect();

        Ok(Json(responses))
    }

    /// Get global metrics for all drops in a time period
    /// GET /drops/{reinjector}/global-metrics?since=2024-01-01T00:00:00Z&until=2024-01-02T00:00:00Z&fee_rate_basis_points=250000
    async fn get_global_metrics(
        Path(reinjector): Path<String>,
        Query(query): Query<GlobalMetricsQuery>,
        State(repo): State<Arc<DropLandQueriesRepository>>,
    ) -> Result<Json<GlobalDropMetricsResponse>, axum::http::StatusCode> {
        let reinjector_lowercase = reinjector.to_lowercase();
        let fee_rate = query
            .fee_rate_basis_points
            .as_ref()
            .and_then(|s| s.parse::<u128>().ok())
            .unwrap_or(250_000);
        let sale_fee_rate = query
            .sale_fee_basis_points
            .as_ref()
            .and_then(|s| s.parse::<u128>().ok())
            .unwrap_or(500_000);
        let level = query.level;

        // Parse timestamps from ISO 8601 format if provided (optional time window)
        let since = query.since.as_ref().map(|s| {
            DateTime::parse_from_rfc3339(s)
                .ok()
                .map(|dt| dt.with_timezone(&Utc).naive_utc())
        });
        let until = query.until.as_ref().map(|u| {
            DateTime::parse_from_rfc3339(u)
                .ok()
                .map(|dt| dt.with_timezone(&Utc).naive_utc())
        });

        // Return 400 only if a provided timestamp fails to parse
        let since = match since {
            Some(Some(dt)) => Some(dt),
            Some(None) => return Err(axum::http::StatusCode::BAD_REQUEST),
            None => None,
        };
        let until = match until {
            Some(Some(dt)) => Some(dt),
            Some(None) => return Err(axum::http::StatusCode::BAD_REQUEST),
            None => None,
        };

        let metrics = repo
            .get_global_metrics(
                &reinjector_lowercase,
                level,
                fee_rate,
                sale_fee_rate,
                since,
                until,
            )
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        // Sum area protocol fees across all tokens
        use sqlx::types::BigDecimal;
        let zero_bd = BigDecimal::from(0);
        let total_revenue_bd: BigDecimal = metrics
            .area_fees_per_token
            .0
            .values()
            .fold(zero_bd.clone(), |acc, v| acc + BigDecimal::from(*v));
        let total_inflows_bd: BigDecimal = metrics
            .inflows_per_token
            .0
            .values()
            .fold(zero_bd.clone(), |acc, v| acc + BigDecimal::from(*v));
        let total_sale_fees_bd: BigDecimal = metrics
            .sale_fees_per_token
            .0
            .values()
            .fold(zero_bd.clone(), |acc, v| acc + BigDecimal::from(*v));

        // Calculate ROI
        let distributed_bd = BigDecimal::from(metrics.total_distributed);
        let global_roi = if distributed_bd > zero_bd {
            let ratio = &total_revenue_bd / &distributed_bd;
            ratio.to_string().parse::<f64>().unwrap_or(0.0)
        } else {
            0.0
        };

        // Build per-token aggregates so the client can apply decimals/prices per token
        let mut token_keys = std::collections::HashSet::new();
        for k in metrics.distributed_per_token.0.keys() {
            token_keys.insert(k.clone());
        }
        for k in metrics.area_fees_per_token.0.keys() {
            token_keys.insert(k.clone());
        }
        for k in metrics.inflows_per_token.0.keys() {
            token_keys.insert(k.clone());
        }
        for k in metrics.sale_fees_per_token.0.keys() {
            token_keys.insert(k.clone());
        }

        let response = GlobalDropMetricsResponse {
            total_revenue: total_revenue_bd.to_string(),
            total_sale_fees: total_sale_fees_bd.to_string(),
            total_drops_distributed: metrics.total_distributed.to_string(),
            total_token_inflows: total_inflows_bd.to_string(),
            total_influenced_auctions: metrics.total_influenced_auctions.to_string(),
            global_roi,
            since: query.since.unwrap_or_else(|| "all".to_string()),
            until: query.until.unwrap_or_else(|| "all".to_string()),
            per_token: token_keys
                .into_iter()
                .map(|token| GlobalTokenMetricsResponse {
                    token: token.clone(),
                    distributed: metrics
                        .distributed_per_token
                        .0
                        .get(&token)
                        .cloned()
                        .unwrap_or_else(|| sqlx::types::BigDecimal::from(0i32).into())
                        .to_string(),
                    fees: metrics
                        .area_fees_per_token
                        .0
                        .get(&token)
                        .cloned()
                        .unwrap_or_else(|| sqlx::types::BigDecimal::from(0i32).into())
                        .to_string(),
                    sale_fees: metrics
                        .sale_fees_per_token
                        .0
                        .get(&token)
                        .cloned()
                        .unwrap_or_else(|| sqlx::types::BigDecimal::from(0i32).into())
                        .to_string(),
                    inflows: metrics
                        .inflows_per_token
                        .0
                        .get(&token)
                        .cloned()
                        .unwrap_or_else(|| sqlx::types::BigDecimal::from(0i32).into())
                        .to_string(),
                })
                .collect(),
        };

        Ok(Json(response))
    }
}

// === Helper functions from main ===

/// Get USDC ratio (STRK price in USD)
fn get_usdc_ratio(
    token_service: &TokenService,
    avnu_service: &AvnuService,
    ekubo_service: &EkuboService,
) -> Option<f64> {
    let usdc_token = token_service
        .list()
        .into_iter()
        .find(|t| t.symbol == USDC_SYMBOL)?;

    let usdc_address = usdc_token.address.to_fixed_hex_string();

    avnu_service
        .get_price_of(&usdc_address)
        .map(|info| info.ratio.0.into())
        .or_else(|| {
            ekubo_service
                .get_price_of(&usdc_address)
                .map(|info| info.ratio.0.into())
        })
}

/// Convert U256 to f64 accounting for token decimals
fn u256_to_f64_with_decimals(value: &starknet::core::types::U256, decimals: u32) -> f64 {
    // Convert U256 to string and then parse
    // This handles the full precision of U256
    let value_str = value.to_string();

    // Parse as f64 and divide by 10^decimals
    let raw_value: f64 = value_str.parse().unwrap_or(0.0);
    let divisor = 10_f64.powi(i32::try_from(decimals).unwrap_or(18));

    raw_value / divisor
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_drop_land_response_serialization() {
        let response = DropLandResponse {
            land_location: 12345,
            owner: "0x123abc".to_string(),
            time_bought: "2024-01-01T00:00:00Z".to_string(),
            stake_token: "0xtoken".to_string(),
            drop_initial_stake: "1000000".to_string(),
            drop_remaining_stake: "500000".to_string(),
            drop_distributed_total: "500000".to_string(),
            token_inflows: serde_json::json!({"0xtoken": "100"}),
            token_inflows_usd: Some("50.0".to_string()),
            area_protocol_fees_total: serde_json::json!({"0xtoken": "25"}),
            area_protocol_fees_total_usd: Some("12.5".to_string()),
            sale_protocol_fees_total: serde_json::json!({"0xtoken": "12"}),
            sale_protocol_fees_total_usd: Some("6.0".to_string()),
            influenced_auctions_total: "200".to_string(),
            drop_roi: 0.15,
            close_date: None,
            is_active: true,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("land_location"));
        assert!(json.contains("owner"));
        assert!(json.contains("drop_initial_stake"));
        assert!(json.contains("is_active"));
    }

    #[test]
    fn test_global_drop_metrics_response_serialization() {
        let response = GlobalDropMetricsResponse {
            total_revenue: "1000000".to_string(),
            total_sale_fees: "50000".to_string(),
            total_drops_distributed: "500000".to_string(),
            total_token_inflows: "250000".to_string(),
            total_influenced_auctions: "12345".to_string(),
            global_roi: 0.25,
            since: "2024-01-01T00:00:00Z".to_string(),
            until: "2024-01-31T00:00:00Z".to_string(),
            per_token: vec![GlobalTokenMetricsResponse {
                token: "0xtoken".to_string(),
                fees: "100".to_string(),
                sale_fees: "10".to_string(),
                distributed: "200".to_string(),
                inflows: "50".to_string(),
            }],
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("total_revenue"));
        assert!(json.contains("total_sale_fees"));
        assert!(json.contains("total_drops_distributed"));
        assert!(json.contains("total_token_inflows"));
        assert!(json.contains("total_influenced_auctions"));
        assert!(json.contains("global_roi"));
        assert!(json.contains("since"));
        assert!(json.contains("until"));
        assert!(json.contains("per_token"));
    }

    #[test]
    fn test_default_level() {
        assert_eq!(default_level(), 1);
    }
}
