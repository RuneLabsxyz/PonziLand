use super::Error;
use starknet::{
    core::{
        codec::{Decode, Encode},
        types::{BlockId, BlockTag, Felt, FunctionCall, U256},
    },
    macros::selector,
};
use std::fmt::Display;

#[derive(Clone, PartialEq, Debug, Decode, Encode)]
pub struct PoolKey {
    pub token0: Felt,
    pub token1: Felt,
    pub fee: u128,
    pub tick_spacing: u32,
    pub extension: Felt,
}

impl Display for PoolKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{{ token0: {:#x}, token1: {:#x}, fee: {}, tick_spacing: {}, extension: {:#x} }}",
            self.token0, self.token1, self.fee, self.tick_spacing, self.extension
        )
    }
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

pub async fn read_pool_price<T: starknet::providers::Provider + Send + Sync>(
    rpc_client: T,
    contract_address: Felt,
    pool: &PoolKey,
) -> Result<LiquidityResponse, Error> {
    let mut call_data = Vec::new();
    pool.encode(&mut call_data).unwrap();

    let response = rpc_client
        .call(
            FunctionCall {
                contract_address,
                entry_point_selector: selector!("get_pool_price"),
                calldata: call_data,
            },
            BlockId::Tag(BlockTag::Latest),
        )
        .await
        .map_err(|e| Error::RpcError(e.to_string()))?;

    Ok(LiquidityResponse::decode(
        response.iter().collect::<Vec<&Felt>>(),
    )?)
}
