use std::sync::Arc;

use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;

use crate::service::token::TokenService;

#[derive(Debug, Serialize)]
pub struct Token {
    pub symbol: String,
    pub address: String,
}

#[derive(Clone)]
pub struct TokenRoute(Arc<TokenService>);

impl TokenRoute {
    pub fn new(token_service: Arc<TokenService>) -> Self {
        Self(token_service)
    }

    pub fn router(self) -> Router {
        Router::new()
            .route("/", get(Self::list_tokens))
            .with_state(self.0.clone())
    }

    async fn list_tokens(State(token_service): State<Arc<TokenService>>) -> Json<Vec<Token>> {
        let tokens = token_service
            .tokens
            .iter()
            .map(|token| Token {
                symbol: token.symbol.clone(),
                address: token.address.to_fixed_hex_string(),
            })
            .collect();
        Json(tokens)
    }
}
