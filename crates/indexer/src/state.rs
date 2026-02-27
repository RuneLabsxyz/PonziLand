use std::sync::Arc;

use axum::extract::FromRef;
use chaindata_repository::{
    AuctionRepository, ChatRepository, LandHistoricalRepository, LandRepository,
    PriceFeedRepository, WalletActivityRepository,
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
    pub price_feed_repository: Arc<PriceFeedRepository>,
    pub auction_repository: Arc<AuctionRepository>,
    pub drop_emitter_wallets: Arc<Vec<String>>,
    pub chat_repository: Arc<ChatRepository>,
}

impl AppState {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        token_service: Arc<TokenService>,
        avnu_service: Arc<AvnuService>,
        ekubo_service: Arc<EkuboService>,
        land_repository: Arc<LandRepository>,
        land_historical_repository: Arc<LandHistoricalRepository>,
        wallet_activity_repository: Arc<WalletActivityRepository>,
        price_feed_repository: Arc<PriceFeedRepository>,
        auction_repository: Arc<AuctionRepository>,
        drop_emitter_wallets: Arc<Vec<String>>,
        chat_repository: Arc<ChatRepository>,
    ) -> Self {
        Self {
            token_service,
            avnu_service,
            ekubo_service,
            land_repository,
            land_historical_repository,
            wallet_activity_repository,
            price_feed_repository,
            auction_repository,
            drop_emitter_wallets,
            chat_repository,
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

impl FromRef<AppState> for Arc<PriceFeedRepository> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.price_feed_repository.clone()
    }
}

impl FromRef<AppState> for Arc<AuctionRepository> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.auction_repository.clone()
    }
}

impl FromRef<AppState> for Arc<Vec<String>> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.drop_emitter_wallets.clone()
    }
}

impl FromRef<AppState> for Arc<ChatRepository> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.chat_repository.clone()
    }
}
