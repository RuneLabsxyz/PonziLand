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
