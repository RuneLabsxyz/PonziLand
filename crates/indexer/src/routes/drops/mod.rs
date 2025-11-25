use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chaindata_models::shared::Location;
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
    pub drop_initial_stake: String,
    pub drop_remaining_stake: String,
    pub drop_distributed_total: String,
    pub neighbor_taxes_received: String,
    pub area_protocol_fees_total: String,
    pub drop_roi: f64,
    pub close_date: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GlobalDropMetricsResponse {
    pub total_revenue: String,
    pub total_drops_distributed: String,
    pub global_roi: f64,
    pub since: String,
    pub until: String,
}

#[derive(Debug, Deserialize)]
pub struct DropMetricsQuery {
    #[serde(default)]
    pub fee_rate_basis_points: Option<u128>,
}

#[derive(Debug, Deserialize)]
pub struct GlobalMetricsQuery {
    pub since: String, // ISO 8601 timestamp
    pub until: String, // ISO 8601 timestamp
    #[serde(default)]
    pub fee_rate_basis_points: Option<u128>,
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
            .route("/{reinjector}/list", get(Self::get_drop_lands))
            .route("/{location}/metrics", get(Self::get_drop_metrics))
            .route("/{reinjector}/global-metrics", get(Self::get_global_metrics))
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

    /// Get all drop lands for a reinjector address
    /// GET /drops/{reinjector}/list
    async fn get_drop_lands(
        Path(reinjector): Path<String>,
        State(repo): State<Arc<DropLandQueriesRepository>>,
    ) -> Result<Json<Vec<(String, String, String, String, Option<String>)>>, axum::http::StatusCode>
    {
        let reinjector_lowercase = reinjector.to_lowercase();

        let drops = repo
            .get_drop_lands(&reinjector_lowercase, None, None)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        let response = drops
            .into_iter()
            .map(
                |(location, owner, time_bought, initial_stake, close_date)| {
                    (
                        location.to_string(),
                        owner,
                        DateTime::<Utc>::from_naive_utc_and_offset(time_bought, Utc).to_rfc3339(),
                        initial_stake,
                        close_date.map(|d| DateTime::<Utc>::from_naive_utc_and_offset(d, Utc).to_rfc3339()),
                    )
                },
            )
            .collect();

        Ok(Json(response))
    }

    /// Get metrics for a specific drop land
    /// GET /drops/{location}/metrics?fee_rate_basis_points=900000
    async fn get_drop_metrics(
        Path(location): Path<u32>,
        Query(query): Query<DropMetricsQuery>,
        State(repo): State<Arc<DropLandQueriesRepository>>,
    ) -> Result<Json<DropLandResponse>, axum::http::StatusCode> {
        let location_u16 = location as u16;
        let location_obj = Location::from(location_u16 as u64);
        let fee_rate = query.fee_rate_basis_points.unwrap_or(900_000);

        let (initial, remaining, neighbor_taxes, area_fees) = repo
            .get_drop_metrics(location_obj, fee_rate)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        // Convert strings to u128 for arithmetic
        let initial_u128: u128 = initial.parse().unwrap_or(0);
        let remaining_u128: u128 = remaining.parse().unwrap_or(0);
        let area_fees_u128: u128 = area_fees.parse().unwrap_or(0);

        let distributed = if initial_u128 > remaining_u128 {
            initial_u128 - remaining_u128
        } else {
            0
        };

        let drop_roi = if distributed > 0 {
            area_fees_u128 as f64 / distributed as f64
        } else {
            0.0
        };

        let response = DropLandResponse {
            land_location: location,
            owner: "reinjector".to_string(),
            time_bought: Utc::now().to_rfc3339(),
            drop_initial_stake: initial,
            drop_remaining_stake: remaining,
            drop_distributed_total: distributed.to_string(),
            neighbor_taxes_received: neighbor_taxes,
            area_protocol_fees_total: area_fees,
            drop_roi,
            close_date: None,
            is_active: true,
        };

        Ok(Json(response))
    }

    /// Get global metrics for all drops in a time period
    /// GET /drops/{reinjector}/global-metrics?since=2024-01-01T00:00:00Z&until=2024-01-02T00:00:00Z&fee_rate_basis_points=900000
    async fn get_global_metrics(
        Path(reinjector): Path<String>,
        Query(query): Query<GlobalMetricsQuery>,
        State(repo): State<Arc<DropLandQueriesRepository>>,
    ) -> Result<Json<GlobalDropMetricsResponse>, axum::http::StatusCode> {
        let reinjector_lowercase = reinjector.to_lowercase();
        let fee_rate = query.fee_rate_basis_points.unwrap_or(900_000);

        // Parse timestamps from ISO 8601 format
        let since = DateTime::parse_from_rfc3339(&query.since)
            .ok()
            .map(|dt| dt.with_timezone(&Utc).naive_utc())
            .ok_or(axum::http::StatusCode::BAD_REQUEST)?;

        let until = DateTime::parse_from_rfc3339(&query.until)
            .ok()
            .map(|dt| dt.with_timezone(&Utc).naive_utc())
            .ok_or(axum::http::StatusCode::BAD_REQUEST)?;

        let (total_revenue, total_distributed) = repo
            .get_global_metrics(&reinjector_lowercase, fee_rate, since, until)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        // Convert strings to u128 for ROI calculation
        let revenue_u128: u128 = total_revenue.parse().unwrap_or(0);
        let distributed_u128: u128 = total_distributed.parse().unwrap_or(0);

        let global_roi = if distributed_u128 > 0 {
            revenue_u128 as f64 / distributed_u128 as f64
        } else {
            0.0
        };

        let response = GlobalDropMetricsResponse {
            total_revenue,
            total_drops_distributed: total_distributed,
            global_roi,
            since: query.since,
            until: query.until,
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
