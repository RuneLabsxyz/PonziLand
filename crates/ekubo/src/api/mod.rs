//! API module for interacting with the Ekubo Web API.
//! This is not to be confused with the contract interactions, which are located in the [`contract` module](../contract)

use thiserror::Error;

pub mod pool;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Invalid pool value")]
    InvalidPoolValue,
    #[error("Invalid base URL: {0}")]
    InvalidBaseUrl(url::ParseError),
    #[error("Http error: {0}")]
    HttpError(#[from] reqwest::Error),
}
