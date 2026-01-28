use std::str::FromStr;

use reqwest::{Client, Url};
use serde::Deserialize;
use starknet::core::types::Felt;

use super::Error;

use crate::contract::pool_price::PoolKey;

/// Stableswap parameters for a pool
#[derive(Debug, Clone, Deserialize)]
pub struct StableswapParams {
    /// The center tick for the stableswap
    pub center_tick: i32,
    /// The amplification factor
    pub amplification: u64,
}

/// A pool is a collection of liquidity for a given pair of tokens.
#[derive(Debug, Deserialize)]
struct RawPool {
    /// The fee of the pool (a 0.128 fixed point number)
    pub fee: String,

    /// The tick spacing of the pool
    pub tick_spacing: u32,

    /// The core address of the pool
    pub core_address: String,

    /// The extension of the pool
    pub extension: String,

    /// The volume of token0 traded in the last 24 hours
    pub volume0_24h: String,
    /// The volume of token1 traded in the last 24 hours
    pub volume1_24h: String,

    /// The fees of token0 collected in the last 24 hours
    pub fees0_24h: String,

    /// The fees of token1 collected in the last 24 hours
    pub fees1_24h: String,

    /// The total value locked of token0 in the pool
    pub tvl0_total: String,

    /// The total value locked of token1 in the pool
    pub tvl1_total: String,

    /// The change in total value locked of token0 in the last 24 hours
    pub tvl0_delta_24h: String,

    /// The change in total value locked of token1 in the last 24 hours
    pub tvl1_delta_24h: String,

    /// Liquidity depth for token0
    pub depth0: String,

    /// Liquidity depth for token1
    pub depth1: String,

    /// Depth percentage (optional)
    pub depth_percent: Option<f64>,

    /// Stableswap parameters (optional)
    pub stableswap_params: Option<StableswapParams>,
}

#[derive(Debug, Clone)]
pub struct Pool {
    // The PoolKey of the found pool
    pub key: PoolKey,

    /// The core address of the pool
    pub core_address: Felt,

    /// The total value locked of token0 in the pool
    pub tvl0_total: Felt,
    /// The total value locked of token1 in the pool
    pub tvl1_total: Felt,

    pub fees0_24h: Felt,
    pub fees1_24h: Felt,

    /// The change in total value locked of token0 in the last 24 hours
    pub tvl0_delta_24h: Felt,
    /// The change in total value locked of token1 in the last 24 hours
    pub tvl1_delta_24h: Felt,

    /// The volume of token0 traded in the last 24 hours
    pub volume0_24h: Felt,
    /// The volume of token1 traded in the last 24 hours
    pub volume1_24h: Felt,

    /// Liquidity depth for token0
    pub depth0: Felt,
    /// Liquidity depth for token1
    pub depth1: Felt,

    /// Depth percentage (optional)
    pub depth_percent: Option<f64>,

    /// Stableswap parameters (optional)
    pub stableswap_params: Option<StableswapParams>,
}

fn get_pool<'a>(token0: &'a str, token1: &'a str, raw_pool: &RawPool) -> Result<Pool, Error> {
    Ok(Pool {
        key: PoolKey {
            token0: Felt::from_str(token0).map_err(|_| Error::InvalidPoolValue)?,
            token1: Felt::from_str(token1).map_err(|_| Error::InvalidPoolValue)?,
            fee: u128::from_str(&raw_pool.fee).map_err(|_| Error::InvalidPoolValue)?,
            tick_spacing: raw_pool.tick_spacing,
            extension: Felt::from_str(&raw_pool.extension).map_err(|_| Error::InvalidPoolValue)?,
        },

        core_address: Felt::from_str(&raw_pool.core_address)
            .map_err(|_| Error::InvalidPoolValue)?,

        tvl0_total: Felt::from_str(&raw_pool.tvl0_total).map_err(|_| Error::InvalidPoolValue)?,
        tvl1_total: Felt::from_str(&raw_pool.tvl1_total).map_err(|_| Error::InvalidPoolValue)?,

        fees0_24h: Felt::from_str(&raw_pool.fees0_24h).map_err(|_| Error::InvalidPoolValue)?,
        fees1_24h: Felt::from_str(&raw_pool.fees1_24h).map_err(|_| Error::InvalidPoolValue)?,

        tvl0_delta_24h: Felt::from_str(&raw_pool.tvl0_delta_24h)
            .map_err(|_| Error::InvalidPoolValue)?,
        tvl1_delta_24h: Felt::from_str(&raw_pool.tvl1_delta_24h)
            .map_err(|_| Error::InvalidPoolValue)?,

        volume0_24h: Felt::from_str(&raw_pool.volume0_24h).map_err(|_| Error::InvalidPoolValue)?,
        volume1_24h: Felt::from_str(&raw_pool.volume1_24h).map_err(|_| Error::InvalidPoolValue)?,

        depth0: Felt::from_str(&raw_pool.depth0).map_err(|_| Error::InvalidPoolValue)?,
        depth1: Felt::from_str(&raw_pool.depth1).map_err(|_| Error::InvalidPoolValue)?,

        depth_percent: raw_pool.depth_percent,
        stableswap_params: raw_pool.stableswap_params.clone(),
    })
}

#[derive(Debug, Deserialize)]
struct Response {
    #[serde(rename = "topPools", default)]
    pub top_pools: Vec<RawPool>,
}

#[cfg_attr(feature = "tracing", tracing::instrument)]
pub(crate) async fn get_all_pools<'a>(
    client: &Client,
    base_url: &str,
    chain_id: &str,
    token0: &'a str,
    token1: &'a str,
) -> Result<Vec<Pool>, Error> {
    let mut url = Url::parse(base_url).map_err(Error::InvalidBaseUrl)?;

    // Get the ordered tokens
    let (token0, token1) = if token0 < token1 {
        (token0, token1)
    } else {
        (token1, token0)
    };

    url.set_path(&format!("/pair/{chain_id}/{token0}/{token1}/pools"));
    client
        .get(url)
        .send()
        .await?
        .json::<Response>()
        .await?
        .top_pools
        .iter()
        .map(|e| get_pool(token0, token1, e))
        .collect::<Result<Vec<Pool>, Error>>()
}

#[cfg(test)]
mod test {
    use reqwest::Client;
    use starknet::macros::felt;

    use super::get_all_pools;

    #[tokio::test]
    async fn test_deserialization() {
        // Request a new server from the pool
        let mut server = mockito::Server::new_async().await;

        // Use one of these addresses to configure your client
        let url = server.url();

        let chain_id = "0x534e5f4d41494e";
        let token0 = felt!("0x1");
        let token1 = felt!("0x2");

        // Create a mock
        let mock = server
            .mock(
                "GET",
                &*format!("/pair/{chain_id}/{token0:#x}/{token1:#x}/pools"),
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(
                r#"
                {
                  "topPools": [
                    {
                        "fee": "3402823669209384634633746074317682114",
                        "tick_spacing": 19802,
                        "core_address": "0x123",
                        "extension": "0",
                        "volume0_24h": "0",
                        "volume1_24h": "0",
                        "fees0_24h": "0",
                        "fees1_24h": "0",
                        "tvl0_total": "1005551088745704980874",
                        "tvl1_total": "205936705486538635215",
                        "tvl0_delta_24h": "0",
                        "tvl1_delta_24h": "0",
                        "depth0": "1000000000000000000",
                        "depth1": "2000000000000000000",
                        "depth_percent": 0.5,
                        "stableswap_params": null
                    }
                  ]
                }
                "#,
            )
            .create_async()
            .await;
        let client = Client::new();
        let result = get_all_pools(
            &client,
            &url,
            chain_id,
            // Note: We voluntarily invert the order to test the reordering done in the function.
            &token1.to_hex_string(),
            &token0.to_hex_string(),
        )
        .await
        .expect("An error occurred while getting pools with mock!");

        // Validate that the endpoint has been called
        mock.assert();

        assert_eq!(result.len(), 1);
    }
}
