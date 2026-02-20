use axum::{extract::State, routing::get, Json, Router};
use chaindata_repository::AuctionRepository;
use serde::Serialize;
use std::sync::Arc;

use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct AuctionResponse {
    pub location: u64,
    pub start_time: String,
    pub start_price: String,
    pub floor_price: String,
    pub is_finished: bool,
    pub decay_rate: i16,
    pub sold_at_price: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActiveAuctionsResponse {
    pub auctions: Vec<AuctionResponse>,
    pub count: usize,
}

pub struct AuctionsRoute;

impl Default for AuctionsRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl AuctionsRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new().route("/active", get(Self::get_active_auctions))
    }

    async fn get_active_auctions(
        State(auction_repository): State<Arc<AuctionRepository>>,
    ) -> Json<ActiveAuctionsResponse> {
        let auctions = auction_repository
            .get_active_auctions()
            .await
            .unwrap_or_default();

        let responses: Vec<AuctionResponse> = auctions
            .into_iter()
            .map(|model| AuctionResponse {
                location: model.location.0,
                start_time: model.start_time.and_utc().to_rfc3339(),
                start_price: model.start_price.to_string(),
                floor_price: model.floor_price.to_string(),
                is_finished: model.is_finished,
                decay_rate: model.decay_rate,
                sold_at_price: model.sold_at_price.map(|p| p.to_string()),
            })
            .collect();
        let count = responses.len();

        Json(ActiveAuctionsResponse {
            auctions: responses,
            count,
        })
    }
}
