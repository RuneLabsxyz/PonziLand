use std::{str::FromStr, sync::Arc};

use anyhow::{Context, Result};
use apalis::prelude::*;
use apalis_cron::{CronContext, CronStream, Schedule};
use chaindata_repository::PriceFeedRepository;
use chrono::Utc;
use price_provider::PairRatio;
use sqlx::types::BigDecimal;
use tracing::{error, info, warn};

use crate::{monitoring::apalis::MonitoringLayer, worker::MonitorManager};

use super::{avnu::AvnuService, ekubo::EkuboService, token::TokenService};

const USDC_SYMBOL: &str = "USDC";

#[derive(Debug, Default, Clone)]
pub struct PriceFeedJob;

pub async fn record_price_feed(
    _: PriceFeedJob,
    _ctx: CronContext<Utc>,
    service: Data<Arc<PriceFeedService>>,
    task_id: TaskId,
) {
    info!("Recording price feed snapshot! {}", task_id);
    service.record_prices().await;
}

pub struct PriceFeedService {
    token_service: Arc<TokenService>,
    avnu_service: Arc<AvnuService>,
    ekubo_service: Arc<EkuboService>,
    repository: Arc<PriceFeedRepository>,
}

impl PriceFeedService {
    pub fn new(
        token_service: Arc<TokenService>,
        avnu_service: Arc<AvnuService>,
        ekubo_service: Arc<EkuboService>,
        repository: Arc<PriceFeedRepository>,
        monitor: &MonitorManager,
    ) -> Result<Arc<Self>> {
        // Run every minute
        let schedule =
            Schedule::from_str("0 * * * * *").with_context(|| "Could not parse Schedule")?;

        let this = Arc::new(Self {
            token_service,
            avnu_service,
            ekubo_service,
            repository,
        });

        let worker = WorkerBuilder::new("price-feed-recorder")
            .enable_tracing()
            .concurrency(1)
            .layer(MonitoringLayer::new("price-feed-record"))
            .data(this.clone())
            .backend(CronStream::new_with_timezone(schedule, Utc))
            .build_fn(record_price_feed);

        monitor.register(move |mon| mon.register(worker));

        info!("Price feed service initialized - recording every minute");

        Ok(this)
    }

    pub async fn record_prices(&self) {
        let timestamp = Utc::now().naive_utc();
        let mut recorded_count = 0;

        // First, get USDC price to calculate USD ratios
        let usdc_ratio = self.get_usdc_ratio();

        if usdc_ratio.is_none() {
            warn!("USDC price not available, USD ratios will be null");
        }

        for token in self.token_service.list() {
            let token_address = token.address.to_fixed_hex_string();

            // Try AVNU first, then fallback to EKUBO
            let price_ratio = self
                .avnu_service
                .get_price_of(&token_address)
                .map(|info| info.ratio)
                .or_else(|| {
                    self.ekubo_service
                        .get_price_of(&token_address)
                        .map(|info| info.ratio)
                });

            if let Some(ratio) = price_ratio {
                let price_f64: f64 = ratio.0.into();
                let price = BigDecimal::try_from(price_f64).unwrap_or_default();

                // Calculate USD ratio: strk_price_in_usd / token_ratio
                // price represents "1 STRK = X tokens" (AVNU inverts ratios)
                // So 1 token = (1/price) STRK, and in USD = (1/price) * strk_usd = strk_usd / price
                let usd_ratio = usdc_ratio.as_ref().and_then(|usdc| {
                    let usdc_f64: f64 = usdc.0.into();
                    if price_f64 > 0.0 {
                        let usd_price = usdc_f64 / price_f64;
                        BigDecimal::try_from(usd_price).ok()
                    } else {
                        None
                    }
                });

                if let Err(err) = self
                    .repository
                    .insert(&token.symbol, price, usd_ratio, timestamp)
                    .await
                {
                    error!("Failed to record price for {}: {:#?}", token.symbol, err);
                } else {
                    recorded_count += 1;
                }
            }
        }

        info!("Recorded {} price points at {}", recorded_count, timestamp);
    }

    fn get_usdc_ratio(&self) -> Option<PairRatio> {
        let usdc_token = self
            .token_service
            .list()
            .into_iter()
            .find(|t| t.symbol == USDC_SYMBOL)?;

        let usdc_address = usdc_token.address.to_fixed_hex_string();

        self.avnu_service
            .get_price_of(&usdc_address)
            .map(|info| info.ratio)
            .or_else(|| {
                self.ekubo_service
                    .get_price_of(&usdc_address)
                    .map(|info| info.ratio)
            })
    }
}

/// Calculate USD ratio from USDC ratio and token ratio.
///
/// Formula: `usd_price = usdc_ratio / token_ratio`
///
/// Where:
/// - `token_ratio` = "1 STRK = X tokens" (AVNU inverts ratios)
/// - `usdc_ratio` = "1 STRK = Y USDC" (i.e., $Y)
/// - Result: 1 token = $(Y/X) USD
///
/// Returns `None` if `token_ratio <= 0` or `usdc_ratio` is `None`.
fn calculate_usd_ratio(usdc_ratio: Option<f64>, token_ratio: f64) -> Option<f64> {
    usdc_ratio.and_then(|usdc| {
        if token_ratio > 0.0 {
            Some(usdc / token_ratio)
        } else {
            None
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const EPSILON: f64 = 1e-10;

    fn approx_eq(a: f64, b: f64) -> bool {
        (a - b).abs() < EPSILON
    }

    #[test]
    fn test_usd_ratio_calculation_normal() {
        // usdc_ratio = 0.5 (1 STRK = 0.5 USDC, so 1 STRK = $0.50)
        // token_ratio = 2.0 (1 STRK = 2 tokens)
        // Expected: 1 token = 0.5/2.0 = $0.25
        let usdc_ratio = Some(0.5);
        let token_ratio = 2.0;

        let result = calculate_usd_ratio(usdc_ratio, token_ratio);

        assert!(result.is_some());
        assert!(
            approx_eq(result.unwrap(), 0.25),
            "Expected 0.25, got {}",
            result.unwrap()
        );
    }

    #[test]
    fn test_usd_ratio_with_small_token_ratio() {
        // Very small token ratio should still work
        let usdc_ratio = Some(1.0);
        let token_ratio = 0.001;

        let result = calculate_usd_ratio(usdc_ratio, token_ratio);

        assert!(result.is_some());
        assert!(
            approx_eq(result.unwrap(), 1000.0),
            "Expected 1000.0, got {}",
            result.unwrap()
        );
    }

    #[test]
    fn test_usd_ratio_without_usdc() {
        // When USDC ratio is None, result should be None
        let usdc_ratio = None;
        let token_ratio = 2.0;

        let result = calculate_usd_ratio(usdc_ratio, token_ratio);

        assert!(result.is_none(), "Expected None when USDC ratio is None");
    }

    #[test]
    fn test_usd_ratio_with_zero_token_ratio() {
        // When token_ratio is 0, should return None to avoid division by zero
        let usdc_ratio = Some(0.5);
        let token_ratio = 0.0;

        let result = calculate_usd_ratio(usdc_ratio, token_ratio);

        assert!(result.is_none(), "Expected None when token ratio is zero");
    }

    #[test]
    fn test_usd_ratio_with_negative_token_ratio() {
        // Negative token_ratio should return None
        let usdc_ratio = Some(0.5);
        let token_ratio = -1.0;

        let result = calculate_usd_ratio(usdc_ratio, token_ratio);

        assert!(
            result.is_none(),
            "Expected None when token ratio is negative"
        );
    }

    #[test]
    fn test_usd_ratio_for_usdc_token() {
        // When the token IS USDC, token_ratio should be ~1.0
        // So usd_ratio should equal usdc_ratio
        let usdc_ratio = Some(0.5);
        let token_ratio = 1.0; // 1 STRK = 1 USDC

        let result = calculate_usd_ratio(usdc_ratio, token_ratio);

        assert!(result.is_some());
        assert!(
            approx_eq(result.unwrap(), 0.5),
            "Expected 0.5, got {}",
            result.unwrap()
        );
    }

    #[test]
    fn test_usd_ratio_large_values() {
        // Test with large but realistic values
        let usdc_ratio = Some(1_000_000.0); // 1 STRK = $1M (hypothetical)
        let token_ratio = 1_000_000_000.0; // 1 STRK = 1B tokens

        let result = calculate_usd_ratio(usdc_ratio, token_ratio);

        assert!(result.is_some());
        assert!(
            approx_eq(result.unwrap(), 0.001),
            "Expected 0.001, got {}",
            result.unwrap()
        );
    }

    #[test]
    fn test_usd_ratio_real_world_scenario() {
        // Real-world-ish scenario:
        // STRK price: $0.40 (1 STRK = 0.40 USDC)
        // Token ratio: 10.0 (1 STRK = 10 tokens, so token is cheaper)
        // Expected: 1 token = $0.04
        let usdc_ratio = Some(0.40);
        let token_ratio = 10.0;

        let result = calculate_usd_ratio(usdc_ratio, token_ratio);

        assert!(result.is_some());
        assert!(
            approx_eq(result.unwrap(), 0.04),
            "Expected 0.04, got {}",
            result.unwrap()
        );
    }

    #[test]
    fn test_usd_ratio_expensive_token() {
        // Expensive token scenario:
        // STRK price: $0.50
        // Token ratio: 0.1 (1 STRK = 0.1 tokens, so 1 token = 10 STRK)
        // Expected: 1 token = $5.00
        let usdc_ratio = Some(0.50);
        let token_ratio = 0.1;

        let result = calculate_usd_ratio(usdc_ratio, token_ratio);

        assert!(result.is_some());
        assert!(
            approx_eq(result.unwrap(), 5.0),
            "Expected 5.0, got {}",
            result.unwrap()
        );
    }
}
