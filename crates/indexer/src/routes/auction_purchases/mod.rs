use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chaindata_repository::LandHistoricalRepository;
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
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

#[derive(Debug, Deserialize)]
pub struct AuctionPurchasesQuery {
    /// ISO 8601 timestamp for range start (e.g., "2024-12-01T00:00:00" or "2024-12-01T00:00:00Z")
    #[serde(default, deserialize_with = "deserialize_optional_datetime")]
    pub from: Option<chrono::NaiveDateTime>,
    /// ISO 8601 timestamp for range end
    #[serde(default, deserialize_with = "deserialize_optional_datetime")]
    pub to: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuctionPurchase {
    pub land_location: u32,
    pub buy_cost_token: String,
    pub time_bought: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AuctionPurchasesResponse {
    pub owner: String,
    pub purchases: Vec<AuctionPurchase>,
    pub total_stark: String,
}

pub struct AuctionPurchasesRoute;

impl Default for AuctionPurchasesRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl AuctionPurchasesRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new().route("/{owner}", get(Self::get_auction_purchases))
    }

    /// Get auction purchases for an owner within an optional time range.
    /// Auctions are identified by having no buy_token_used (STARK-only auctions)
    /// or buy_token_used being the STARK token address.
    async fn get_auction_purchases(
        Path(owner): Path<String>,
        Query(query): Query<AuctionPurchasesQuery>,
        State(land_historical_repository): State<Arc<LandHistoricalRepository>>,
    ) -> Result<Json<AuctionPurchasesResponse>, axum::http::StatusCode> {
        // STARK token address (auctions are STARK-only)
        const STARK_TOKEN: &str =
            "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

        // Convert address to lowercase for case-insensitive matching
        let owner_lowercase = owner.to_lowercase();

        let positions = land_historical_repository
            .get_by_owner(&owner_lowercase)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut total_stark = BigDecimal::from(0);
        let mut purchases: Vec<AuctionPurchase> = Vec::new();

        for pos in positions {
            // Filter by time range
            if let Some(from) = query.from {
                if pos.time_bought < from {
                    continue;
                }
            }
            if let Some(to) = query.to {
                if pos.time_bought > to {
                    continue;
                }
            }

            // Only include auction purchases (STARK token or no token specified)
            // Auctions use STARK, secondary market uses various tokens
            let is_auction = match &pos.buy_token_used {
                None => true, // No token specified = auction
                Some(token) => token.to_lowercase() == STARK_TOKEN,
            };

            if !is_auction {
                continue;
            }

            // Get the buy cost
            if let Some(ref buy_cost) = pos.buy_cost_token {
                // Convert U256 to BigDecimal for addition
                let cost_decimal: BigDecimal = (*buy_cost).into();
                total_stark += cost_decimal;

                purchases.push(AuctionPurchase {
                    land_location: pos.land_location.0 as u32,
                    buy_cost_token: buy_cost.to_string(),
                    time_bought: pos.time_bought.to_string(),
                });
            }
        }

        // Convert BigDecimal to string, removing any decimal point (should be whole number)
        let total_str = total_stark.to_string().replace('.', "");

        Ok(Json(AuctionPurchasesResponse {
            owner: owner_lowercase,
            purchases,
            total_stark: total_str,
        }))
    }
}
