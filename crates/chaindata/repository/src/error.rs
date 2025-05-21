#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("SQL Error")]
    SqlError(#[from] sqlx::Error),
    #[error("Invalid ID: {0}")]
    InvalidId(#[from] chaindata_models::error::Error),
}
