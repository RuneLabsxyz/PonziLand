use starknet::core::types::Felt;
use std::collections::HashMap;

pub mod math;
pub mod price;

pub use math::u256fd128::*;
pub use price::PairRatio;

/// Trait for price providers.
#[async_trait::async_trait]
pub trait PriceProvider {
    async fn get_price_of_pairs<T: IntoIterator<Item = String> + Send>(
        &self,
        reference_token_address: &str,
        tokens: T,
    ) -> Result<HashMap<Felt, PairRatio>, impl std::error::Error>;
}
