use axum::{extract::State, routing::get, Json, Router};
use ekubo::{contract::pool_price::PoolKey, price::PairRatio};
use serde::Serialize;
use std::sync::Arc;

use crate::{
    service::{ekubo::EkuboService, token::TokenService},
    state::AppState,
};

#[repr(transparent)]
#[derive(Debug)]
pub struct Price(pub(crate) PairRatio);

impl Serialize for Price {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_f64(self.0 .0.into())
    }
}

#[derive(Debug, Serialize)]
pub struct TokenWithPrice {
    pub symbol: String,
    pub address: String,
    pub ratio: Option<Price>,
    pub best_pool: Option<PoolKey>,
}
pub struct PriceRoute;

impl Default for PriceRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl PriceRoute {
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new().route("/", get(Self::get_price))
    }

    async fn get_price(
        State(token_service): State<Arc<TokenService>>,
        State(ekubo_service): State<Arc<EkuboService>>,
    ) -> Json<Vec<TokenWithPrice>> {
        let tokens = token_service
            .tokens
            .iter()
            .map(|token| {
                let ratio = ekubo_service.get_price_of(&token.address.to_fixed_hex_string());

                if let Some(ratio) = ratio {
                    TokenWithPrice {
                        symbol: token.symbol.clone(),
                        address: token.address.to_fixed_hex_string(),
                        ratio: Some(Price(ratio.ratio)),
                        best_pool: Some(ratio.pool),
                    }
                } else {
                    TokenWithPrice {
                        symbol: token.symbol.clone(),
                        address: token.address.to_fixed_hex_string(),
                        ratio: None,
                        best_pool: None,
                    }
                }
            })
            .collect();
        Json(tokens)
    }
}
