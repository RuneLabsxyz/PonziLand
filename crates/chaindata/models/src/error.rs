#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Invalid Format")]
    InvalidFormat,
    #[error("Invalid part: {0}")]
    InvalidPart(&'static str),
}
