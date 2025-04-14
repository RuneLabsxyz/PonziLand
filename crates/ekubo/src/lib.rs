use crate::api::pool::Pool;
use crate::contract::pool_price::PoolKey;
use api::pool::get_all_pools;
use contract::pool_price::read_pool_price;
use math::u256fd128::U256FD128;
use price::PairRatio;
use reqwest::Client as ReqwestClient;
pub use starknet::core::types::Felt;
use std::sync::Arc;
use thiserror::Error;

pub mod api;
pub mod contract;
pub mod math;
pub mod price;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Pool not found")]
    PoolNotFound,
    #[error(transparent)]
    ApiError(#[from] api::Error),
    #[error("RPC error")]
    RpcError(#[from] crate::contract::Error),
    #[error("HTTP request error")]
    HttpError(#[from] reqwest::Error),
}

pub struct EkuboClient<Client>
where
    Client: starknet::providers::Provider + Send + Sync,
{
    contract_address: Felt,
    rpc_client: Client,
    // Allows to pass a reqwest client if needed
    http_client: Arc<ReqwestClient>,
    ekubo_api: String,
}

impl<Client> EkuboClient<Client>
where
    Client: starknet::providers::Provider + Send + Sync + std::fmt::Debug,
{
    pub fn new(contract_address: Felt, rpc_client: Client, ekubo_api: String) -> Self {
        Self {
            contract_address,
            rpc_client,
            http_client: Arc::new(ReqwestClient::new()),
            ekubo_api,
        }
    }

    pub async fn get_pools(&self, token0: Felt, token1: Felt) -> Result<Vec<Pool>, Error> {
        Ok(get_all_pools(
            &self.http_client,
            &self.ekubo_api,
            &token0.to_fixed_hex_string(),
            &token1.to_fixed_hex_string(),
        )
        .await?)
    }

    pub async fn read_pool_price(&self, pool: &PoolKey) -> Result<PairRatio, Error> {
        let response = read_pool_price(&self.rpc_client, self.contract_address, pool).await?;
        // Then do the conversion
        // Let's compute the price from this result.
        // The value sqrt_ratio is a 64.128 fixed point number.
        // To convert it to a price, first divide it by 2**128, then square it to get the price.
        // Since USDC is token1, this value is the price of the pool in USDC/ETH.
        // (0x029895c9cbfca44f2c46e6e9b5459b / 2**128)**2 == 1.56914... ×10^-9.
        // To adjust for display, we have to account for the decimal difference between the USDC and ETH tokens.
        // Because USDC has 6 decimals and ETH has 18 decimals, we need to scale it up by 10**(18-6) to be human readable.
        // 1.56914e-9 * 1e12 == 1.56914e3 == 1569.14 USDC/ETH.
        let sqrt_ratio: U256FD128 = response.sqrt_ratio.into();
        Ok(PairRatio(sqrt_ratio.squared()))
    }
}
