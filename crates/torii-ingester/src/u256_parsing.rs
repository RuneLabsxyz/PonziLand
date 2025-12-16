use std::num::ParseIntError;

use serde::Deserialize;
use thiserror::Error;

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum U256Input {
    String(String),
    Number(serde_json::Number),
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum PartitionedU256 {
    Parts(PartitionedWords),
    Wrapped { value: PartitionedWords },
}

#[derive(Debug, Deserialize)]
pub struct PartitionedWords {
    pub low: U128Component,
    #[serde(default)]
    pub high: Option<U128Component>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum U128Component {
    String(String),
    Number(serde_json::Number),
}

#[derive(Debug, Error)]
pub enum U256ParseError {
    #[error("failed to parse `{input}` as base {base} u128: {source}")]
    InvalidNumber {
        input: String,
        base: u32,
        #[source]
        source: ParseIntError,
    },
}

pub fn parse_hex_or_decimal_u128(value: &str) -> Result<u128, U256ParseError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(0);
    }

    let mut radix: u32 = 10;
    let digits = if let Some(hex) = trimmed
        .strip_prefix("0x")
        .or_else(|| trimmed.strip_prefix("0X"))
    {
        radix = 16;
        hex
    } else {
        trimmed
    };

    u128::from_str_radix(digits, radix).map_err(|source| U256ParseError::InvalidNumber {
        input: digits.to_string(),
        base: radix,
        source,
    })
}

pub fn parse_component(component: U128Component) -> Result<u128, U256ParseError> {
    match component {
        U128Component::String(value) => parse_hex_or_decimal_u128(&value),
        U128Component::Number(value) => parse_hex_or_decimal_u128(&value.to_string()),
    }
}

pub fn parse_partitioned_words(
    partitioned: PartitionedU256,
) -> Result<(u128, u128), U256ParseError> {
    let words = match partitioned {
        PartitionedU256::Parts(parts) => parts,
        PartitionedU256::Wrapped { value } => value,
    };

    let low = parse_component(words.low)?;
    let high = match words.high {
        Some(value) => parse_component(value)?,
        None => 0,
    };

    Ok((low, high))
}
