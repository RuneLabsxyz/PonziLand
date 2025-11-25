use std::sync::Arc;

use axum::extract::FromRef;
use chaindata_repository::{
    DropLandQueriesRepository, LandHistoricalRepository, LandRepository, WalletActivityRepository,
};

use crate::service::{avnu::AvnuService, ekubo::EkuboService, token::TokenService};

#[derive(Clone)]
pub struct AppState {
    pub token_service: Arc<TokenService>,
    pub avnu_service: Arc<AvnuService>,
    pub ekubo_service: Arc<EkuboService>,
    pub land_repository: Arc<LandRepository>,
    pub land_historical_repository: Arc<LandHistoricalRepository>,
    pub wallet_activity_repository: Arc<WalletActivityRepository>,
    pub drop_land_queries_repository: Arc<DropLandQueriesRepository>,
}

impl AppState {
    pub fn new(
        token_service: Arc<TokenService>,
        avnu_service: Arc<AvnuService>,
        ekubo_service: Arc<EkuboService>,
        land_repository: Arc<LandRepository>,
        land_historical_repository: Arc<LandHistoricalRepository>,
        wallet_activity_repository: Arc<WalletActivityRepository>,
        drop_land_queries_repository: Arc<DropLandQueriesRepository>,
    ) -> Self {
        Self {
            token_service,
            avnu_service,
            ekubo_service,
            land_repository,
            land_historical_repository,
            wallet_activity_repository,
            drop_land_queries_repository,
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

impl FromRef<AppState> for Arc<LandHistoricalRepository> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.land_historical_repository.clone()
    }
}

impl FromRef<AppState> for Arc<WalletActivityRepository> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.wallet_activity_repository.clone()
    }
}

impl FromRef<AppState> for Arc<DropLandQueriesRepository> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.drop_land_queries_repository.clone()
    }
}
