use axum::{extract::State, routing::get, Json, Router};
use chaindata_repository::LandRepository;
use serde::Serialize;
use std::{
    sync::{Arc, OnceLock},
    time::{Duration, Instant},
};
use tokio::sync::RwLock;

use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct TokenDistribution {
    pub token_address: String,
    pub land_count: u64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct LandDistributionResponse {
    pub total_lands: u64,
    pub distributions: Vec<TokenDistribution>,
    pub cached_at: String,
}

#[derive(Debug, Clone)]
struct CachedDistribution {
    data: LandDistributionResponse,
    cached_at: Instant,
}

impl CachedDistribution {
    fn is_expired(&self) -> bool {
        self.cached_at.elapsed() > Duration::from_secs(10)
    }
}

// Global cache for land distribution
static DISTRIBUTION_CACHE: OnceLock<Arc<RwLock<Option<CachedDistribution>>>> = OnceLock::new();

pub struct LandsRoute;

impl Default for LandsRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl LandsRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new().route("/distribution", get(Self::get_distribution))
    }

    #[allow(clippy::cast_precision_loss)]
    async fn get_distribution(
        State(land_repository): State<Arc<LandRepository>>,
    ) -> Json<LandDistributionResponse> {
        // Check if we have valid cached data
        let cache = DISTRIBUTION_CACHE.get_or_init(|| Arc::new(RwLock::new(None)));
        {
            let cache_read = cache.read().await;
            if let Some(cached) = cache_read.as_ref() {
                if !cached.is_expired() {
                    return Json(cached.data.clone());
                }
            }
        }

        // Cache is expired or doesn't exist, fetch new data
        let distribution_map = land_repository
            .get_land_distribution()
            .await
            .unwrap_or_default();

        let total_lands: u64 = distribution_map.values().sum();

        let mut distributions: Vec<TokenDistribution> = distribution_map
            .into_iter()
            .map(|(token_address, land_count)| {
                let percentage = if total_lands > 0 {
                    (land_count as f64 / total_lands as f64) * 100.0
                } else {
                    0.0
                };

                TokenDistribution {
                    token_address,
                    land_count,
                    percentage,
                }
            })
            .collect();

        // Sort by land count descending
        distributions.sort_by(|a, b| b.land_count.cmp(&a.land_count));

        let response = LandDistributionResponse {
            total_lands,
            distributions,
            cached_at: chrono::Utc::now().to_rfc3339(),
        };

        // Update cache
        {
            let mut cache_write = cache.write().await;
            *cache_write = Some(CachedDistribution {
                data: response.clone(),
                cached_at: Instant::now(),
            });
        }

        Json(response)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_cache_expiry() {
        let cache = DISTRIBUTION_CACHE.get_or_init(|| Arc::new(RwLock::new(None)));

        // Clear cache first
        {
            let mut cache_write = cache.write().await;
            *cache_write = None;
        }

        // Initially cache should be empty
        {
            let cache_read = cache.read().await;
            assert!(cache_read.is_none());
        }

        // Simulate adding data to cache
        let test_response = LandDistributionResponse {
            total_lands: 100,
            distributions: vec![],
            cached_at: chrono::Utc::now().to_rfc3339(),
        };

        {
            let mut cache_write = cache.write().await;
            *cache_write = Some(CachedDistribution {
                data: test_response,
                cached_at: Instant::now(),
            });
        }

        // Cache should not be expired immediately
        {
            let cache_read = cache.read().await;
            assert!(cache_read.is_some());
            assert!(!cache_read.as_ref().unwrap().is_expired());
        }

        // Wait a bit and check it's still not expired (less than 10 seconds)
        sleep(Duration::from_millis(100)).await;
        {
            let cache_read = cache.read().await;
            assert!(cache_read.is_some());
            assert!(!cache_read.as_ref().unwrap().is_expired());
        }
    }

    #[test]
    fn test_token_distribution_serialization() {
        let distribution = TokenDistribution {
            token_address: "0x123abc".to_string(),
            land_count: 42,
            percentage: 15.5,
        };

        let json = serde_json::to_string(&distribution).unwrap();
        assert!(json.contains("token_address"));
        assert!(json.contains("land_count"));
        assert!(json.contains("percentage"));
    }

    #[test]
    fn test_land_distribution_response_serialization() {
        let response = LandDistributionResponse {
            total_lands: 100,
            distributions: vec![
                TokenDistribution {
                    token_address: "0x123".to_string(),
                    land_count: 60,
                    percentage: 60.0,
                },
                TokenDistribution {
                    token_address: "0x456".to_string(),
                    land_count: 40,
                    percentage: 40.0,
                },
            ],
            cached_at: "2023-01-01T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("total_lands"));
        assert!(json.contains("distributions"));
        assert!(json.contains("cached_at"));
    }
}
