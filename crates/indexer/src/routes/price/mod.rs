use axum::{extract::State, routing::get, Json, Router};
use ekubo::contract::pool_price::PoolKey;
use price_provider::PairRatio;
use serde::Serialize;
use std::sync::Arc;

use crate::{
    service::{avnu::AvnuService, ekubo::EkuboService, token::TokenService},
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

#[repr(transparent)]
#[derive(Debug)]
pub struct PriceStr(pub(crate) PairRatio);
impl Serialize for PriceStr {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.0 .0.to_string())
    }
}

#[derive(Debug, Serialize)]
pub struct TokenWithPrice {
    pub symbol: String,
    pub address: String,
    pub ratio: Option<Price>,
    pub ratio_exact: Option<PriceStr>,
    pub best_pool: Option<PoolKey>,
}
pub struct PriceRoute;

impl Default for PriceRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl PriceRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new().route("/", get(Self::get_price))
    }

    #[allow(clippy::unused_async)] // required for axum
    async fn get_price(
        State(token_service): State<Arc<TokenService>>,
        State(avnu_service): State<Arc<AvnuService>>,
        State(ekubo_service): State<Arc<EkuboService>>,
    ) -> Json<Vec<TokenWithPrice>> {
        let tokens = token_service
            .tokens
            .iter()
            .map(|token| {
                let token_address = token.address.to_fixed_hex_string();

                // Try AVNU first
                let avnu_price = avnu_service.get_price_of(&token_address);
                if let Some(avnu_info) = avnu_price {
                    return TokenWithPrice {
                        symbol: token.symbol.clone(),
                        address: token_address,
                        ratio: Some(Price(avnu_info.ratio.clone())),
                        ratio_exact: Some(PriceStr(avnu_info.ratio)),
                        best_pool: None, // AVNU doesn't use pools like EKUBO
                    };
                }

                // Fallback to EKUBO
                let ekubo_price = ekubo_service.get_price_of(&token_address);
                if let Some(ekubo_info) = ekubo_price {
                    TokenWithPrice {
                        symbol: token.symbol.clone(),
                        address: token_address,
                        ratio: Some(Price(ekubo_info.ratio.clone())),
                        ratio_exact: Some(PriceStr(ekubo_info.ratio)),
                        best_pool: Some(ekubo_info.pool),
                    }
                } else {
                    TokenWithPrice {
                        symbol: token.symbol.clone(),
                        address: token_address,
                        ratio: None,
                        ratio_exact: None,
                        best_pool: None,
                    }
                }
            })
            .collect();
        Json(tokens)
    }
}
