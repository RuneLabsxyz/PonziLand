use std::sync::Arc;

use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;

use crate::service::token::TokenService;

#[derive(Debug, Serialize)]
pub struct Token {
    pub symbol: String,
    pub address: String,
    pub decimals: u32,
}

#[derive(Clone)]
pub struct TokenRoute(Arc<TokenService>);

impl TokenRoute {
    #[must_use]
    pub fn new(token_service: Arc<TokenService>) -> Self {
        Self(token_service)
    }

    pub fn router(self) -> Router {
        Router::new()
            .route("/", get(Self::list_tokens))
            .with_state(self.0.clone())
    }

    #[allow(clippy::unused_async)] // required for axum
    async fn list_tokens(State(token_service): State<Arc<TokenService>>) -> Json<Vec<Token>> {
        let tokens = token_service
            .tokens
            .iter()
            .map(|token| {
                let address = token.address.to_fixed_hex_string();
                let decimals = token_service.get_decimals(&address);
                Token {
                    symbol: token.symbol.clone(),
                    address,
                    decimals,
                }
            })
            .collect();
        Json(tokens)
    }
}
