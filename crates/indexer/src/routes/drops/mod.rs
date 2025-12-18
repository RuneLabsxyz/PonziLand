use axum::{extract::State, routing::get, Json, Router};
use chaindata_repository::LandHistoricalRepository;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;

use crate::service::{avnu::AvnuService, ekubo::EkuboService, token::TokenService};
use crate::state::AppState;
use crate::utils::normalize_token_address;

const USDC_SYMBOL: &str = "USDC";

#[derive(Debug, Clone, Serialize)]
pub struct DropsEmittedResponse {
    pub total_usd: f64,
    pub by_token: HashMap<String, String>,
    pub by_token_usd: HashMap<String, f64>,
    pub positions_count: u64,
    pub tracked_wallets: Vec<String>,
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
        Router::new().route("/emitted", get(Self::get_drops_emitted))
    }

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

        // Convert to USD and build response
        let mut total_usd = 0.0_f64;
        let mut by_token: HashMap<String, String> = HashMap::new();
        let mut by_token_usd: HashMap<String, f64> = HashMap::new();

        for (token_address, amount) in &aggregated_outflows {
            // Store raw amount as string
            by_token.insert(token_address.clone(), amount.to_string());

            let normalized_address = normalize_token_address(token_address);

            // Get token price and convert to USD
            let token_ratio: Option<f64> = avnu_service
                .get_price_of(&normalized_address)
                .map(|info| info.ratio.0.into())
                .or_else(|| {
                    ekubo_service
                        .get_price_of(&normalized_address)
                        .map(|info| info.ratio.0.into())
                });

            let decimals = get_token_decimals(&normalized_address);

            if let (Some(token_ratio), Some(usdc)) = (token_ratio, usdc_ratio) {
                // Calculate USD value
                // usdc ratio is already in USD form (1 STRK = Y USD)
                // token_ratio is "1 STRK = X tokens"
                // So 1 token = (usdc / token_ratio) USD
                if token_ratio > 0.0 {
                    let usd_per_token = usdc / token_ratio;

                    // Convert U256 amount to f64 with proper decimals
                    let amount_f64 = u256_to_f64_with_decimals(amount, decimals);
                    let usd_value = amount_f64 * usd_per_token;

                    by_token_usd.insert(token_address.clone(), usd_value);
                    total_usd += usd_value;
                }
            }
        }

        Ok(Json(DropsEmittedResponse {
            total_usd,
            by_token,
            by_token_usd,
            positions_count: positions.len() as u64,
            tracked_wallets: wallets,
        }))
    }
}

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

/// Get token decimals based on known token addresses
/// USDC/USDT = 6 decimals, BTC = 8 decimals, SOL = 9 decimals, BONK = 5 decimals, most others = 18 decimals
fn get_token_decimals(normalized_address: &str) -> u32 {
    match normalized_address {
        // USDC - 6 decimals
        "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8" => 6,
        // USDT - 6 decimals
        "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8" => 6,
        // WBTC - 8 decimals
        "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac" => 8,
        // SOL - 9 decimals (Solana native)
        "0x01e70aedffd376afe33cebdf51ed5365131dccb2a5b2cb36d02b785442912b9b" => 9,
        // BONK - 5 decimals
        "0x0781bddf077f25a53411d567093f63f9a839ec9e6bc4d99d9240cf742b98b0e8" => 5,
        // Default to 18 decimals (ETH, STRK, LORDS, meme tokens, etc.)
        _ => 18,
    }
}
