use std::sync::Arc;

use axum::extract::FromRef;

use crate::service::{ekubo::EkuboService, token::TokenService};

#[derive(Clone)]
pub struct AppState {
    pub token_service: Arc<TokenService>,
    pub ekubo_service: Arc<EkuboService>,
}

impl AppState {
    pub fn new(token_service: Arc<TokenService>, ekubo_service: Arc<EkuboService>) -> Self {
        Self {
            token_service,
            ekubo_service,
        }
    }
}

impl FromRef<AppState> for Arc<TokenService> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.token_service.clone()
    }
}

impl FromRef<AppState> for Arc<EkuboService> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.ekubo_service.clone()
    }
}
