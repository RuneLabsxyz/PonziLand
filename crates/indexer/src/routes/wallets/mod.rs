use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use chaindata_repository::WalletActivityRepository;
use moka::future::Cache;
use serde::{Deserialize, Serialize};
use std::{
    sync::{Arc, OnceLock},
    time::Duration,
};

use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct ActiveWalletsQuery {
    pub weeks: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WalletInfo {
    pub address: String,
    pub activity_count: i32,
    pub first_activity: String,
    pub last_activity: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActiveWalletsResponse {
    pub active_wallets: Vec<WalletInfo>,
    pub total_count: i64,
    pub time_filter: Option<String>,
    pub cached_at: String,
}

// Global LRU/TTL cache for wallet activity
static WALLETS_CACHE: LazyLock<Cache<String, ActiveWalletsResponse>> =
    LazyLock::new(|| Cache::new(100));
pub struct WalletsRoute;

impl Default for WalletsRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl WalletsRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new().route("/active", get(Self::get_active_wallets))
    }

    async fn get_active_wallets(
        Query(query): Query<ActiveWalletsQuery>,
        State(wallet_activity_repository): State<Arc<WalletActivityRepository>>,
    ) -> Json<ActiveWalletsResponse> {
        let cache_key = match query.weeks {
            Some(weeks) => format!("weeks_{}", weeks),
            None => "all_time".to_string(),
        };

        // Initialize cache lazily with TTL and capacity
        let cache = WALLETS_CACHE.get_or_init(|| {
            Arc::new(
                Cache::builder()
                    .time_to_live(Duration::from_secs(30))
                    .max_capacity(1_000)
                    .build(),
            )
        });

        if let Some(cached) = cache.get(&cache_key).await {
            return Json(cached);
        }

        // Cache is expired or doesn't exist, fetch new data
        let wallets = wallet_activity_repository
            .get_active_wallets(query.weeks)
            .await
            .unwrap_or_default();

        let total_count = wallet_activity_repository
            .get_active_wallet_count(query.weeks)
            .await
            .unwrap_or(0);

        let active_wallets: Vec<WalletInfo> = wallets
            .into_iter()
            .map(|wallet| {
                let first_activity = wallet.first_activity_utc().to_rfc3339();
                let last_activity = wallet.last_activity_utc().to_rfc3339();
                WalletInfo {
                    address: wallet.address,
                    activity_count: wallet.activity_count,
                    first_activity,
                    last_activity,
                }
            })
            .collect();

        let time_filter = query.weeks.map(|w| format!("{} weeks", w));

        let response = ActiveWalletsResponse {
            active_wallets,
            total_count,
            time_filter,
            cached_at: chrono::Utc::now().to_rfc3339(),
        };

        // Update cache
        cache.insert(cache_key.clone(), response.clone()).await;

        Json(response)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_insert_and_get() {
        let cache = WALLETS_CACHE.get_or_init(|| {
            Arc::new(
                Cache::builder()
                    .time_to_live(Duration::from_secs(30))
                    .max_capacity(1_000)
                    .build(),
            )
        });

        // Clear cache first
        cache.invalidate_all();

        let test_response = ActiveWalletsResponse {
            active_wallets: vec![],
            total_count: 100,
            time_filter: Some("4 weeks".to_string()),
            cached_at: chrono::Utc::now().to_rfc3339(),
        };

        let cache_key = "test_key".to_string();
        cache.insert(cache_key.clone(), test_response.clone()).await;

        let fetched = cache.get(&cache_key).await;
        assert!(fetched.is_some());
        assert_eq!(fetched.unwrap().total_count, 100);
    }

    #[test]
    fn test_wallet_info_serialization() {
        let wallet = WalletInfo {
            address: "0x1234567890abcdef".to_string(),
            activity_count: 42,
            first_activity: "2024-01-01T00:00:00Z".to_string(),
            last_activity: "2024-01-15T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&wallet).unwrap();
        assert!(json.contains("address"));
        assert!(json.contains("activity_count"));
        assert!(json.contains("first_activity"));
        assert!(json.contains("last_activity"));
    }

    #[test]
    fn test_active_wallets_response_serialization() {
        let response = ActiveWalletsResponse {
            active_wallets: vec![WalletInfo {
                address: "0x123".to_string(),
                activity_count: 10,
                first_activity: "2024-01-01T00:00:00Z".to_string(),
                last_activity: "2024-01-15T00:00:00Z".to_string(),
            }],
            total_count: 1000,
            time_filter: Some("4 weeks".to_string()),
            cached_at: "2024-01-16T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("active_wallets"));
        assert!(json.contains("total_count"));
        assert!(json.contains("time_filter"));
        assert!(json.contains("cached_at"));
    }
}
