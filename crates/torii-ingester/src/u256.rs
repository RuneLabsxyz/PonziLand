// All the behavior should be tested correctly, so those lints are not relevent in this case.
#![allow(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss
)]

use std::{
    fmt::{self, Display},
    num::ParseIntError,
    ops::Deref,
    str::FromStr,
};

use dojo_types::primitive::Primitive;
use serde::{
    de::{self, value::MapAccessDeserializer, MapAccess, Visitor},
    Deserialize, Serialize,
};
use serde_json::Value;
use starknet::core::types::U256 as RawU256;

use crate::{conversions::FromPrimitive, error::ToriiConversionError};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct U256(RawU256);

impl<T> From<T> for U256
where
    T: Into<RawU256>,
{
    fn from(value: T) -> Self {
        U256(value.into())
    }
}

impl U256 {
    #[must_use]
    pub fn from_words(low: u128, high: u128) -> Self {
        U256(RawU256::from_words(low, high))
    }

    #[must_use]
    pub fn to_words(&self) -> (u128, u128) {
        (self.0.low(), self.0.high())
    }

    #[must_use]
    pub fn from_u64_words(value: [u64; 4]) -> Self {
        // Convert 4 u64 words into 2 u128 words (low, high)
        // low = word0 + (word1 << 64)
        // high = word2 + (word3 << 64)
        U256(RawU256::from_words(
            u128::from(value[0]) + (u128::from(value[1]) << 64),
            u128::from(value[2]) + (u128::from(value[3]) << 64),
        ))
    }

    #[must_use]
    pub fn to_u64_words(&self) -> [u64; 4] {
        let high = self.0.high();
        let low = self.0.low();
        [
            low as u64,
            (low >> 64) as u64,
            high as u64,
            (high >> 64) as u64,
        ]
    }
}

impl FromStr for U256 {
    type Err = ParseIntError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s.starts_with("0x") {
            // Parse hexadecimal
            let s = s.trim_start_matches("0x");
            if s.is_empty() {
                return Err("empty hex string".parse::<u8>().unwrap_err());
            }

            // Parse as u128 first to handle potential overflow
            let (high, low) = if s.len() <= 32 {
                // Can fit in a single u128
                let low = u128::from_str_radix(s, 16)?;
                (0, low)
            } else if s.len() <= 64 {
                // Need both high and low parts
                let high_idx = s.len().saturating_sub(32);
                let high_str = &s[..high_idx];
                let low_str = &s[high_idx..];

                let high = u128::from_str_radix(high_str, 16)?;
                let low = u128::from_str_radix(low_str, 16)?;
                (high, low)
            } else {
                // Too large
                return Err("hex string too large".parse::<u8>().unwrap_err());
            };

            Ok(U256(RawU256::from_words(low, high)))
        } else {
            // Parse decimal
            // Split the processing to handle large numbers
            if s.len() <= 38 {
                // Max decimal digits for u128
                let num = s.parse::<u128>()?;
                Ok(U256(RawU256::from(num)))
            } else {
                // For larger numbers, need manual processing with high/low words
                // This is a simplified approach that doesn't handle the full range
                // but covers most practical cases
                Err("decimal string too large".parse::<u8>().unwrap_err())
            }
        }
    }
}

impl Display for U256 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

impl Deref for U256 {
    type Target = RawU256;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Serialize for U256 {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        // Print as hex
        serializer.serialize_str(&format!("{:#x}", self.0))
    }
}

impl<'de> Deserialize<'de> for U256 {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct U256Visitor;

        impl<'de> Visitor<'de> for U256Visitor {
            type Value = U256;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("number, or string representing a number")
            }

            fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                U256::from_str(v)
                    .map_err(|e| de::Error::custom(format!("Failed to parse U256: {e}")))
            }

            fn visit_u64<E>(self, v: u64) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                Ok(U256::from(v))
            }

            fn visit_i64<E>(self, v: i64) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                Ok(U256::from(v as u128))
            }

            fn visit_f64<E>(self, v: f64) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                pub fn strict_f64_to_u64(x: f64) -> Option<u64> {
                    // Check if fractional component is 0 and that it can map to an integer in the f64
                    // Using fract() is equivalent to using `as u64 as f64` and checking it matches
                    if x.fract() == 0.0 && x >= u64::MIN as f64 && x <= u64::MAX as f64 {
                        return Some(x.trunc() as u64);
                    }

                    None
                }

                Ok(U256::from(strict_f64_to_u64(v).ok_or_else(|| {
                    de::Error::custom("f64 too big to be stored in a U256")
                })?))
            }

            fn visit_map<M>(self, map: M) -> Result<Self::Value, M::Error>
            where
                M: MapAccess<'de>,
            {
                let value = Value::deserialize(MapAccessDeserializer::new(map)).map_err(|err| {
                    de::Error::custom(format!(
                        "Failed to deserialize map representation of U256: {err}"
                    ))
                })?;

                parse_u256_value(value).map_err(de::Error::custom)
            }
        }

        deserializer.deserialize_any(U256Visitor)
    }
}

fn parse_u128_from_str(value: &str) -> Result<u128, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(0);
    }

    let (digits, radix) = if let Some(hex) = trimmed
        .strip_prefix("0x")
        .or_else(|| trimmed.strip_prefix("0X"))
    {
        (hex, 16)
    } else {
        (trimmed, 10)
    };

    u128::from_str_radix(digits, radix).map_err(|err| err.to_string())
}

fn parse_u128_component(value: Value) -> Result<u128, String> {
    match value {
        Value::String(s) => parse_u128_from_str(&s),
        Value::Number(num) => parse_u128_from_str(&num.to_string()),
        Value::Object(mut map) => {
            if let Some(inner) = map.remove("value") {
                return parse_u128_component(inner);
            }
            Err(format!(
                "Unsupported object representation for U256 component: {:?}",
                map
            ))
        }
        Value::Array(mut arr) => {
            if let Some(first) = arr.pop() {
                parse_u128_component(first)
            } else {
                Err("Empty array cannot represent a U256 component".to_string())
            }
        }
        Value::Bool(_) | Value::Null => Err("Unsupported value for a U256 component".to_string()),
    }
}

fn parse_u256_value(value: Value) -> Result<U256, String> {
    match value {
        Value::String(s) => {
            U256::from_str(&s).map_err(|err| format!("Failed to parse U256 string: {err}"))
        }
        Value::Number(num) => U256::from_str(&num.to_string())
            .map_err(|err| format!("Failed to parse numeric U256: {err}")),
        Value::Object(mut map) => {
            if let Some(inner) = map.remove("value") {
                return parse_u256_value(inner);
            }

            if let Some(low_value) = map.remove("low") {
                let low = parse_u128_component(low_value)?;
                let high = map
                    .remove("high")
                    .map(parse_u128_component)
                    .transpose()?
                    .unwrap_or(0);
                return Ok(U256::from_words(low, high));
            }

            if let Some(hex_value) = map.remove("hex") {
                return parse_u256_value(hex_value);
            }

            Err(format!(
                "Unsupported object representation for U256: {:?}",
                map
            ))
        }
        Value::Array(arr) => {
            let mut iter = arr.into_iter();
            let first = iter
                .next()
                .ok_or_else(|| "Array cannot be empty for U256 parsing".to_string())?;

            if let Some(second) = iter.next() {
                let low = parse_u128_component(first)?;
                let high = parse_u128_component(second)?;

                if iter.next().is_some() {
                    return Err(
                        "Array must only contain two elements for low/high U256".to_string()
                    );
                }

                Ok(U256::from_words(low, high))
            } else {
                parse_u256_value(first)
            }
        }
        Value::Bool(_) | Value::Null => Err("Unsupported value for U256".to_string()),
    }
}

impl FromPrimitive for U256 {
    fn from_primitive(primitive: Primitive) -> Result<Self, ToriiConversionError> {
        match primitive.as_u256() {
            Some(u) => Ok(U256::from(u)),
            None => Err(ToriiConversionError::WrongType {
                expected: "U256".to_string(),
                got: format!("{primitive:?}"),
            }),
        }
    }
}

#[cfg(test)]
mod test {
    use super::U256;

    #[test]
    fn test_deserialization() {
        let json = "\"0x1c8\"";
        assert_eq!(
            serde_json::from_str::<U256>(json).expect("Deserialization error"),
            U256::from(456u32)
        );

        // Test decimal deserialization
        let json = "\"123456789\"";
        assert_eq!(
            serde_json::from_str::<U256>(json).expect("Deserialization error"),
            U256::from(123_456_789u32)
        );

        let json_map = r#"{ "low": "0x1", "high": "0x0" }"#;
        assert_eq!(
            serde_json::from_str::<U256>(json_map).expect("Map deserialization error"),
            U256::from(1u32)
        );

        let json_nested = r#"{ "value": { "low": "2", "high": "0" } }"#;
        assert_eq!(
            serde_json::from_str::<U256>(json_nested).expect("Nested map deserialization error"),
            U256::from(2u32)
        );
    }

    #[test]
    fn test_from_u64_words() {
        // Test zero values
        let zero_words = [0u64, 0u64, 0u64, 0u64];
        let zero_val = U256::from_u64_words(zero_words);
        assert_eq!(zero_val, U256::from_words(0, 0));
        assert_eq!(zero_val.to_u64_words(), zero_words);

        // Test values in each word position

        // First word (lowest 64 bits)
        let words1 = [123u64, 0u64, 0u64, 0u64];
        let val1 = U256::from_u64_words(words1);
        assert_eq!(val1, U256::from_words(123, 0));
        assert_eq!(val1.to_u64_words(), words1);

        // Second word (bits 64-127)
        let words2 = [0u64, 456u64, 0u64, 0u64];
        let val2 = U256::from_u64_words(words2);
        assert_eq!(val2, U256::from_words(456u128 << 64, 0));
        assert_eq!(val2.to_u64_words(), words2);

        // Third word (bits 128-191)
        let words3 = [0u64, 0u64, 789u64, 0u64];
        let val3 = U256::from_u64_words(words3);
        assert_eq!(val3, U256::from_words(0, 789));
        assert_eq!(val3.to_u64_words(), words3);

        // Fourth word (bits 192-255, highest)
        let words4 = [0u64, 0u64, 0u64, 101_112u64];
        let val4 = U256::from_u64_words(words4);
        assert_eq!(val4, U256::from_words(0, 101_112u128 << 64));
        assert_eq!(val4.to_u64_words(), words4);

        // Test with a value in all positions
        let mixed_words = [123u64, 456u64, 789u64, 101_112u64];
        let mixed_val = U256::from_u64_words(mixed_words);
        assert_eq!(mixed_val.to_u64_words(), mixed_words);
    }

    #[test]
    fn test_to_u64_words() {
        // Test conversion of different values to u64 words

        // Zero
        assert_eq!(
            U256::from_words(0, 0).to_u64_words(),
            [0u64, 0u64, 0u64, 0u64]
        );

        // Simple value in low part
        assert_eq!(
            U256::from_words(42, 0).to_u64_words(),
            [42u64, 0u64, 0u64, 0u64]
        );

        // Max u64 in first word
        assert_eq!(
            U256::from_words(u128::from(u64::MAX), 0).to_u64_words(),
            [u64::MAX, 0u64, 0u64, 0u64]
        );

        // Value in high part
        assert_eq!(
            U256::from_words(0, 42).to_u64_words(),
            [0u64, 0u64, 42u64, 0u64]
        );

        // Non-zero values in all words
        let low = 0x1234_u128 | (0x5678_u128 << 64);
        let high = 0x9ABC_u128 | (0xDEF0_u128 << 64);
        let val = U256::from_words(low, high);
        assert_eq!(val.to_u64_words(), [0x1234, 0x5678, 0x9ABC, 0xDEF0]);

        // Round-trip test - create from words and convert back
        let test_words = [0x1111, 0x2222, 0x3333, 0x4444];
        let val = U256::from_u64_words(test_words);
        assert_eq!(val.to_u64_words(), test_words);

        // Test maximum values
        let max_words = [u64::MAX, u64::MAX, u64::MAX, u64::MAX];
        let max_val = U256::from_u64_words(max_words);
        assert_eq!(max_val.to_u64_words(), max_words);
    }
}
