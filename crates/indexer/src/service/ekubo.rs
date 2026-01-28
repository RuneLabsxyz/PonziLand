use std::{collections::HashMap, str::FromStr, sync::Arc};

use anyhow::{Context, Result};
use apalis::prelude::*;
use apalis_cron::{CronContext, CronStream, Schedule};
use arc_swap::ArcSwap;
use chrono::Utc;
use ekubo::{contract::pool_price::PoolKey, EkuboClient};
use price_provider::PairRatio;
use starknet::providers::{jsonrpc::HttpTransport, JsonRpcClient};
use tracing::{error, info};

use crate::{config::Conf, monitoring::apalis::MonitoringLayer, worker::MonitorManager};

use super::token::TokenService;

#[derive(Debug, Default, Clone)]
pub struct EkuboJob;

pub async fn update_ekubo(
    _: EkuboJob,
    _ctx: CronContext<Utc>,
    ekubo: Data<Arc<EkuboService>>,
    task_id: TaskId,
) {
    info!("Update! {}", task_id);

    ekubo.update().await;
}

pub struct EkuboService {
    token_service: Arc<TokenService>,
    exchange_rate: ArcSwap<PriceInformation>,
    client: ekubo::EkuboClient<JsonRpcClient<HttpTransport>>,
}

#[derive(Debug, Clone)]
pub struct EkuboTokenInformation {
    pub ratio: PairRatio,
    pub pool: PoolKey,
}

#[derive(Default, Debug)]
pub struct PriceInformation {
    inner: HashMap<String, EkuboTokenInformation>,
}

impl EkuboService {
    pub async fn new(
        config: &Conf,
        token_service: Arc<TokenService>,
        monitor: &MonitorManager,
    ) -> Result<Arc<Self>> {
        let schedule =
            Schedule::from_str("0/30 * * * * *").with_context(|| "Could not parse Schedule")?;

        let rpc_client = JsonRpcClient::new(HttpTransport::new(config.starknet.rpc_url.clone()));

        let this = Arc::new(Self {
            token_service,
            exchange_rate: ArcSwap::new(Arc::new(PriceInformation::default())),
            client: EkuboClient::new(
                config.ekubo.core_contract_address,
                rpc_client,
                config.ekubo.api_url.to_string(),
                config.ekubo.chain_id.clone(),
            ),
        });

        // queue initial update
        info!("Initial price fetching...");
        this.update().await;

        let worker = WorkerBuilder::new("morning-cereal")
            .enable_tracing()
            .concurrency(1)
            .layer(MonitoringLayer::new("ekubo-update"))
            .data(this.clone())
            .backend(CronStream::new_with_timezone(schedule, Utc))
            .build_fn(update_ekubo);

        monitor.register(move |mon| mon.register(worker));

        Ok(this)
    }

    pub fn get_price_of(&self, token: &str) -> Option<EkuboTokenInformation> {
        self.exchange_rate.load().inner.get(token).cloned()
    }

    #[allow(clippy::missing_panics_doc)]
    /// Update the exchange rate information.
    pub async fn update(&self) {
        let main_token = self.token_service.main_token().address;

        let mut price_info = PriceInformation::default();

        'token_loop: for token in self.token_service.list() {
            let pool = match self.client.get_pools(main_token, token.address).await {
                Ok(vec) if !vec.is_empty() => vec.into_iter().next().unwrap(), // safe because of the bounds check
                Ok(_) => {
                    // No pools found for token, go to the next one.
                    continue 'token_loop;
                }
                Err(err) => {
                    error!(
                        "Failed to fetch pool for token {}: {:#?}",
                        token.address, err
                    );
                    continue 'token_loop;
                }
            };

            let price = match self.client.read_pool_price(&pool.key).await {
                Ok(price) => price,
                Err(err) => {
                    error!("Failed to fetch price for pool {}: {:#?}", pool.key, err);
                    continue 'token_loop;
                }
            };

            let price = if main_token < token.address {
                price
            } else {
                price.inverse()
            };

            price_info.inner.insert(
                token.address.to_fixed_hex_string(),
                EkuboTokenInformation {
                    pool: pool.key,
                    ratio: price,
                },
            );
        }

        info!("Finished ekubo update!");

        // Once everything is done, update the exchange rate
        self.exchange_rate.swap(Arc::new(price_info));
    }

    /// Check if the service has any price data (for health checks)
    pub fn has_price_data(&self) -> bool {
        !self.exchange_rate.load().inner.is_empty()
    }
}
