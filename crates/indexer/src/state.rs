use std::sync::Arc;

use axum::extract::FromRef;
use chaindata_repository::{LandRepository, SimplePositionRepository};

use crate::service::{avnu::AvnuService, ekubo::EkuboService, token::TokenService};

#[derive(Clone)]
pub struct AppState {
    pub token_service: Arc<TokenService>,
    pub avnu_service: Arc<AvnuService>,
    pub ekubo_service: Arc<EkuboService>,
    pub land_repository: Arc<LandRepository>,
    pub simple_position_repository: Arc<SimplePositionRepository>,
}

impl AppState {
    pub fn new(
        token_service: Arc<TokenService>,
        avnu_service: Arc<AvnuService>,
        ekubo_service: Arc<EkuboService>,
        land_repository: Arc<LandRepository>,
        simple_position_repository: Arc<SimplePositionRepository>,
    ) -> Self {
        Self {
            token_service,
            avnu_service,
            ekubo_service,
            land_repository,
            simple_position_repository,
        }
    }
}

impl FromRef<AppState> for Arc<TokenService> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.token_service.clone()
    }
}

impl FromRef<AppState> for Arc<AvnuService> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.avnu_service.clone()
    }
}

impl FromRef<AppState> for Arc<EkuboService> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.ekubo_service.clone()
    }
}

impl FromRef<AppState> for Arc<LandRepository> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.land_repository.clone()
    }
}

impl FromRef<AppState> for Arc<SimplePositionRepository> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.simple_position_repository.clone()
    }
}
