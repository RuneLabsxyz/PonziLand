use std::{
    fmt::{self, Display},
    num::ParseIntError,
    ops::Deref,
    str::FromStr,
};

use serde::{
    de::{self, Visitor},
    Deserialize, Serialize,
};
use starknet::core::types::U256 as RawU256;

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
                    .map_err(|e| de::Error::custom(format!("Failed to parse U256: {}", e)))
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
        }

        deserializer.deserialize_any(U256Visitor)
    }
}

#[cfg(test)]
mod test {
    use crate::models::shared::U256;

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
            U256::from(123456789u32)
        );
    }
}
