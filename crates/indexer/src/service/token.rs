use std::{collections::HashMap, str::FromStr, sync::Arc};

use anyhow::{anyhow, Context, Result};
use apalis::prelude::*;
use apalis_cron::{CronContext, CronStream, Schedule};
use arc_swap::ArcSwap;
use chrono::Utc;
use starknet::{
    core::types::{BlockId, BlockTag, Felt, FunctionCall},
    macros::selector,
    providers::{jsonrpc::HttpTransport, JsonRpcClient, Provider},
};
use tracing::{info, warn};

use crate::{
    config::Conf, config::Token, monitoring::apalis::MonitoringLayer, worker::MonitorManager,
};

#[derive(Debug, Default, Clone)]
pub struct DecimalsJob;

pub async fn update_decimals(
    _: DecimalsJob,
    _ctx: CronContext<Utc>,
    service: Data<Arc<TokenService>>,
    task_id: TaskId,
) {
    info!("Decimals update! {}", task_id);
    service.fetch_all_decimals().await;
}

pub struct TokenService {
    pub tokens: Vec<Token>,
    pub main_token: Token,
    decimals_cache: ArcSwap<HashMap<String, u32>>,
    rpc_client: JsonRpcClient<HttpTransport>,
}

impl TokenService {
    pub async fn new(config: &Conf, monitor: &MonitorManager) -> Result<Arc<Self>> {
        let main_token = config
            .token
            .iter()
            .find(|e| e.symbol == config.default_token)
            .ok_or_else(|| anyhow!("Impossible to find token!"))?;

        let rpc_client = JsonRpcClient::new(HttpTransport::new(config.starknet.rpc_url.clone()));

        let this = Arc::new(Self {
            tokens: config.token.clone(),
            main_token: main_token.clone(),
            decimals_cache: ArcSwap::new(Arc::new(HashMap::new())),
            rpc_client,
        });

        info!("Initial token decimals fetching...");
        this.fetch_all_decimals().await;

        // Register hourly refresh worker
        let schedule =
            Schedule::from_str("0 0 * * * *").with_context(|| "Could not parse Schedule")?;

        let worker = WorkerBuilder::new("token-decimals")
            .enable_tracing()
            .concurrency(1)
            .layer(MonitoringLayer::new("token-decimals-update"))
            .data(this.clone())
            .backend(CronStream::new_with_timezone(schedule, Utc))
            .build_fn(update_decimals);

        monitor.register(move |mon| mon.register(worker));

        Ok(this)
    }

    #[must_use]
    pub fn list(&self) -> Vec<Token> {
        self.tokens.clone()
    }

    #[must_use]
    pub fn main_token(&self) -> &Token {
        &self.main_token
    }

    /// Get decimals for a token by its normalized address.
    /// Returns cached value from on-chain fetch, or 18 (default) if not yet fetched.
    #[must_use]
    pub fn get_decimals(&self, normalized_address: &str) -> u32 {
        self.decimals_cache
            .load()
            .get(normalized_address)
            .copied()
            .unwrap_or(18)
    }

    /// Fetch decimals for all configured tokens from on-chain.
    /// Failures for individual tokens are logged but don't stop the process.
    pub async fn fetch_all_decimals(&self) {
        let mut new_decimals = HashMap::new();

        for token in &self.tokens {
            match self.fetch_decimals_for(&token.address).await {
                Ok(decimals) => {
                    let addr = token.address.to_fixed_hex_string();
                    info!("Fetched decimals for {}: {}", token.symbol, decimals);
                    new_decimals.insert(addr, decimals);
                }
                Err(e) => {
                    warn!(
                        "Failed to fetch decimals for {} ({}): {}",
                        token.symbol,
                        token.address.to_fixed_hex_string(),
                        e
                    );
                }
            }
        }

        if !new_decimals.is_empty() {
            info!("Updated decimals cache with {} tokens", new_decimals.len());
            self.decimals_cache.swap(Arc::new(new_decimals));
        } else {
            warn!("No decimals fetched, keeping existing cache");
        }
    }

    /// Fetch decimals for a single token via ERC20 decimals() call.
    async fn fetch_decimals_for(&self, address: &Felt) -> Result<u32> {
        let response = self
            .rpc_client
            .call(
                FunctionCall {
                    contract_address: *address,
                    entry_point_selector: selector!("decimals"),
                    calldata: vec![],
                },
                BlockId::Tag(BlockTag::Latest),
            )
            .await
            .with_context(|| format!("RPC call failed for {}", address))?;

        if response.is_empty() {
            return Err(anyhow!("Empty response from decimals() call"));
        }

        // decimals() returns a single felt containing the value (typically 0-18)
        let decimals_felt = response[0];
        let decimals: u64 = decimals_felt
            .try_into()
            .with_context(|| "Failed to convert felt to u64")?;

        Ok(decimals as u32)
    }
}
