use starknet::core::codec::Error as CodecError;
use thiserror::Error;

pub mod pool_price;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Unable to serialize / deserialize response")]
    SerdeError(#[from] CodecError),
    #[error("An error occurred while interacting with the RPC")]
    RpcError(String),
}
