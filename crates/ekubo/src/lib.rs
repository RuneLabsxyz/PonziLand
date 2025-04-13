use math::u256fd128::U256FD128;
use price::PairRatio;
use starknet::{
    core::{
        codec::{Decode, Encode},
        types::{BlockId, BlockTag, Felt, FunctionCall, U256},
    },
    macros::selector,
};
use thiserror::Error;

pub mod math;
mod price;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Pool not found")]
    PoolNotFound,
    #[error("Invalid price")]
    InvalidPrice,
    #[error("RPC error")]
    RpcError,
}

#[derive(Clone, PartialEq, Debug, Decode, Encode)]
pub struct PoolKey {
    pub token0: Felt,
    pub token1: Felt,
    pub fee: u128,
    pub tick_spacing: u32,
    pub extension: Felt,
}

#[derive(Clone, Copy, PartialEq, Debug, Decode, Encode)]
pub struct I129 {
    pub value: u128,
    pub sign: bool,
}

#[derive(Clone, PartialEq, Debug, Decode, Encode)]
pub struct LiquidityResponse {
    pub sqrt_ratio: U256,
    pub tick: I129,
}

pub struct EkuboClient<'a, Client>
where
    Client: starknet::providers::Provider,
{
    contract_address: Felt,
    rpc_client: &'a Client,
}

impl<'a, Client> EkuboClient<'a, Client>
where
    Client: starknet::providers::Provider,
{
    pub fn new(contract_address: Felt, rpc_client: &'a Client) -> Self {
        Self {
            contract_address,
            rpc_client,
        }
    }

    pub async fn read_pool_price(&self, pool: PoolKey) -> Result<PairRatio, Error> {
        let mut call_data = Vec::new();
        pool.encode(&mut call_data).unwrap();

        let response = self
            .rpc_client
            .call(
                FunctionCall {
                    contract_address: self.contract_address,
                    entry_point_selector: selector!("get_pool_price"),
                    calldata: call_data,
                },
                BlockId::Tag(BlockTag::Latest),
            )
            .await
            .map_err(|_| Error::RpcError)?;

        let response = LiquidityResponse::decode(response.iter().collect::<Vec<&Felt>>()).unwrap();

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
