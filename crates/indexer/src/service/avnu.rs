use std::{collections::HashMap, str::FromStr, sync::Arc};

use anyhow::{Context, Result};
use apalis::prelude::*;
use apalis_cron::{CronContext, CronStream, Schedule};
use arc_swap::ArcSwap;
use avnu_pricing::AvnuPriceProvider;
use chrono::Utc;
use price_provider::{PairRatio, PriceProvider};
use starknet::core::types::Felt;
use tracing::{error, info};

use crate::{config::Conf, monitoring::apalis::MonitoringLayer, worker::MonitorManager};

use super::token::TokenService;

#[derive(Debug, Default, Clone)]
pub struct AvnuJob;

pub async fn update_avnu(
    _: AvnuJob,
    _ctx: CronContext<Utc>,
    avnu: Data<Arc<AvnuService>>,
    task_id: TaskId,
) {
    info!("AVNU price update! {}", task_id);
    avnu.update().await;
}

pub struct AvnuService {
    token_service: Arc<TokenService>,
    exchange_rate: ArcSwap<PriceInformation>,
    provider: AvnuPriceProvider,
}

#[derive(Debug, Clone)]
pub struct AvnuTokenInformation {
    pub ratio: PairRatio,
    pub token_address: Felt,
}

#[derive(Default, Debug)]
pub struct PriceInformation {
    inner: HashMap<String, AvnuTokenInformation>,
}

impl AvnuService {
    pub async fn new(
        config: &Conf,
        token_service: Arc<TokenService>,
        monitor: &MonitorManager,
    ) -> Result<Arc<Self>> {
        let schedule =
            Schedule::from_str("0/30 * * * * *").with_context(|| "Could not parse Schedule")?;

        let avnu_url = config.avnu.api_url.clone();

        let provider = AvnuPriceProvider::new(avnu_url);

        let this = Arc::new(Self {
            token_service,
            exchange_rate: ArcSwap::new(Arc::new(PriceInformation::default())),
            provider,
        });

        // queue initial update
        info!("Initial AVNU price fetching...");
        this.update().await;

        let worker = WorkerBuilder::new("avnu-price-updater")
            .enable_tracing()
            .concurrency(1)
            .layer(MonitoringLayer::new("avnu-update"))
            .data(this.clone())
            .backend(CronStream::new_with_timezone(schedule, Utc))
            .build_fn(update_avnu);

        monitor.register(move |mon| mon.register(worker));

        Ok(this)
    }

    pub fn get_price_of(&self, token: &str) -> Option<AvnuTokenInformation> {
        self.exchange_rate.load().inner.get(token).cloned()
    }

    /// Update the exchange rate information from AVNU API.
    pub async fn update(&self) {
        let main_token = self.token_service.main_token().address;
        let main_token_str = main_token.to_fixed_hex_string();

        let mut price_info = PriceInformation::default();

        // Collect all token addresses for the AVNU API call
        let token_addresses: Vec<String> = self
            .token_service
            .list()
            .iter()
            .map(|token| token.address.to_fixed_hex_string())
            .collect();

        if token_addresses.is_empty() {
            info!("No tokens to fetch prices for");
            return;
        }

        match self
            .provider
            .get_price_of_pairs(&main_token_str, token_addresses.clone())
            .await
        {
            Ok(price_ratios) => {
                for (token_felt, ratio) in price_ratios {
                    let token_address_str = format!("0x{token_felt:064x}");

                    price_info.inner.insert(
                        token_address_str,
                        AvnuTokenInformation {
                            ratio: ratio.inverse(),
                            token_address: token_felt,
                        },
                    );
                }

                info!(
                    "Successfully updated {} AVNU prices",
                    price_info.inner.len()
                );
            }
            Err(err) => {
                error!("Failed to fetch AVNU prices: {:#?}", err);
                return;
            }
        }

        // Update the exchange rate atomically
        self.exchange_rate.swap(Arc::new(price_info));
    }

    /// Check if the service has any price data (for health checks)
    pub fn has_price_data(&self) -> bool {
        !self.exchange_rate.load().inner.is_empty()
    }
}
