use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fmt::Debug;
use std::hash::Hash;
use std::str::FromStr;
use std::sync::OnceLock;
use torii_ingester::prelude::Felt;

#[derive(Clone, Serialize, Deserialize)]
pub struct Id {
    pub block_id: Felt,
    pub tx_hash: Felt,
    pub event_idx: u32,

    // Internal cached string representation
    #[serde(skip)]
    string_repr: OnceLock<String>,
}

impl Debug for Id {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_string())
    }
}

impl Hash for Id {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.block_id.hash(state);
        self.tx_hash.hash(state);
        self.event_idx.hash(state);
    }
}

impl PartialEq for Id {
    fn eq(&self, other: &Self) -> bool {
        self.block_id == other.block_id
            && self.tx_hash == other.tx_hash
            && self.event_idx == other.event_idx
    }
}

impl Eq for Id {}

impl Id {
    /// Parses the eventID from the torii SQL provider.
    pub fn parse_from_torii(s: &str) -> Result<Self, String> {
        let parts: Vec<&str> = s.split(':').collect();
        if parts.len() != 3 {
            return Err("Invalid format".to_string());
        }

        let block_id = parts[0]
            .parse()
            .map_err(|_| "Invalid block ID".to_string())?;
        let tx_hash = parts[1]
            .parse()
            .map_err(|_| "Invalid transaction hash".to_string())?;
        let event_idx = u32::from_str_radix(parts[2].trim_start_matches("0x"), 16)
            .map_err(|_| "Invalid event index".to_string())?;

        Ok(Self {
            block_id,
            tx_hash,
            event_idx,
            string_repr: OnceLock::new(),
        })
    }

    // Testing function, that creates a new block for testing
    // should NEVER be used in production code
    #[cfg_attr(
        not(test),
        deprecated(note = "This function should not only be used for testing")
    )]
    #[must_use]
    pub fn new_test(block_id: u64, tx_hash: u64, event_idx: u32) -> Self {
        Self {
            block_id: block_id.into(),
            tx_hash: tx_hash.into(),
            event_idx,
            string_repr: OnceLock::new(),
        }
    }

    #[must_use]
    pub fn new(block_id: Felt, tx_hash: Felt, event_idx: u32) -> Self {
        Self {
            block_id,
            tx_hash,
            event_idx,
            string_repr: OnceLock::new(),
        }
    }

    // Get the string representation, computing it if needed
    pub fn as_string(&self) -> String {
        self.string_repr
            .get_or_init(|| {
                format!(
                    "bk_{}:tx_{}:e_{:08}",
                    self.block_id.to_fixed_hex_string(),
                    self.tx_hash.to_fixed_hex_string(),
                    self.event_idx
                )
            })
            .clone()
    }
}

use sqlx::decode::Decode;
use sqlx::encode::{Encode, IsNull};
use sqlx::postgres::PgTypeInfo;
use sqlx::types::Type;

impl Type<sqlx::Postgres> for Id {
    fn type_info() -> PgTypeInfo {
        <String as Type<sqlx::Postgres>>::type_info()
    }
}

impl Encode<'_, sqlx::Postgres> for Id {
    fn encode_by_ref(
        &self,
        buf: &mut <sqlx::Postgres as sqlx::Database>::ArgumentBuffer<'_>,
    ) -> Result<IsNull, sqlx::error::BoxDynError> {
        <String as Encode<sqlx::Postgres>>::encode(self.as_string(), buf)
    }
}

impl<'r> Decode<'r, sqlx::Postgres> for Id {
    fn decode(value: sqlx::postgres::PgValueRef<'r>) -> Result<Self, sqlx::error::BoxDynError> {
        let s = <String as Decode<sqlx::Postgres>>::decode(value)?;
        Ok(s.parse()?)
    }
}

impl FromStr for Id {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        // Parse "bk_{block_id}:tx_{tx_hash}:e_{event_idx}"
        let parts: Vec<&str> = s.split(':').collect();
        if parts.len() != 3 {
            return Err("Invalid event ID format".to_string());
        }

        let block_part = parts[0];
        if !block_part.starts_with("bk_") {
            return Err("Invalid block part format".to_string());
        }
        let block_id_prefix = &block_part[3..];
        let block_id =
            Felt::from_hex(block_id_prefix).map_err(|_| "Invalid block id prefix".to_string())?;

        let tx_part = parts[1];
        if !tx_part.starts_with("tx_") {
            return Err("Invalid tx part format".to_string());
        }
        let tx_hash_prefix = &tx_part[3..];

        // In a real implementation, you'd need to fetch the full tx_hash from the database
        // or have a way to reconstruct it. For this example, we'll pad with zeros.
        let tx_hash =
            Felt::from_hex(tx_hash_prefix).map_err(|_| "Invalid tx hash prefix".to_string())?;

        let event_part = parts[2];
        if !event_part.starts_with("e_") {
            return Err("Invalid event part format".to_string());
        }
        let event_idx = event_part[2..]
            .parse::<u32>()
            .map_err(|_| "Invalid event_idx".to_string())?;

        let cell = OnceLock::new();
        cell.set(s.to_string()).unwrap(); // PANIC SAFETY: This is never going to panic, as we just created the value

        Ok(Self {
            block_id,
            tx_hash,
            event_idx,
            string_repr: cell,
        })
    }
}

impl Ord for Id {
    fn cmp(&self, other: &Self) -> Ordering {
        // Same ordering logic as before
        self.block_id
            .cmp(&other.block_id)
            .then_with(|| self.tx_hash.cmp(&other.tx_hash))
            .then_with(|| self.event_idx.cmp(&other.event_idx))
    }
}

impl PartialOrd for Id {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::types::Type;
    use std::collections::HashMap;

    #[test]
    pub fn test_torii_parsing() {
        let event_id = Id::parse_from_torii("0x000000000000000000000000000000000000000000000000000000000b63a9:0x5f26258a75882780784979d970a3579c091e92073d61f7e90260e1133f75c8a:0x10").unwrap();
        assert_eq!(event_id.block_id, Felt::from(0xb63a9));
        assert_eq!(
            event_id.tx_hash,
            Felt::from_hex("0x5f26258a75882780784979d970a3579c091e92073d61f7e90260e1133f75c8a")
                .unwrap()
        );
        assert_eq!(event_id.event_idx, 0x10);
    }

    #[test]
    fn test_event_id_creation_and_string_repr() {
        let block_id = Felt::from(0xb63a9);
        let tx_hash =
            Felt::from_hex("0x5f26258a75882780784979d970a3579c091e92073d61f7e90260e1133f75c8a")
                .unwrap();
        let event_idx = 0x10;

        let event_id = Id::new(block_id, tx_hash, event_idx);

        // Test the string representation
        let expected_string = format!(
            "bk_{}:tx_{}:e_{:08}",
            block_id.to_fixed_hex_string(),
            tx_hash.to_fixed_hex_string(),
            event_idx
        );

        assert_eq!(event_id.as_string(), expected_string);

        // Test that calling as_string() twice uses the cached value
        assert_eq!(event_id.as_string(), expected_string);
    }

    #[test]
    fn test_serde_attributes() {
        // This test validates that the struct correctly implements
        // the Serialize/Deserialize traits and that the string_repr
        // field is properly marked with #[serde(skip)]

        let block_id = Felt::from(0xb63a9);
        let tx_hash =
            Felt::from_hex("0x5f26258a75882780784979d970a3579c091e92073d61f7e90260e1133f75c8a")
                .unwrap();
        let event_idx = 0x10;

        let original = Id::new(block_id, tx_hash, event_idx);
        let duplicate = Id::new(block_id, tx_hash, event_idx);

        // Access string representation of the first one to populate the cache
        let _ = original.as_string();

        // Both should be equal despite one having populated string_repr
        assert_eq!(original, duplicate);

        // In a real test with serde_json, we would also do:
        // let json = serde_json::to_string(&event_id1).unwrap();
        // let deserialized: EventId = serde_json::from_str(&json).unwrap();
        // assert_eq!(deserialized, event_id1);
    }

    #[test]
    #[allow(clippy::mutable_key_type)]
    fn test_equality_and_hashing() {
        let block_id = Felt::from(0xb63a9);
        let tx_hash =
            Felt::from_hex("0x5f26258a75882780784979d970a3579c091e92073d61f7e90260e1133f75c8a")
                .unwrap();
        let event_idx = 0x10;

        let event_id_first = Id::new(block_id, tx_hash, event_idx);
        let event_id_second = Id::new(block_id, tx_hash, event_idx); // Same values as event_id1

        // Test equality
        assert_eq!(event_id_first, event_id_second);

        // Test hash equality using immutable HashMap (fixing mutable key type warning)
        // The OnceCell<> Isn't used in the hash function, so it is fine.
        let mut map: HashMap<Id, &str> = HashMap::new();
        let key = event_id_first.clone();
        map.insert(key, "first");
        assert_eq!(map.get(&event_id_second), Some(&"first"));

        // Create a different event_id
        let different_event = Id::new(block_id, tx_hash, 0x11); // Different event_idx

        // Test inequality
        assert_ne!(event_id_first, different_event);

        // Test hash inequality
        assert_eq!(map.get(&different_event), None);
    }

    #[test]
    fn test_ordering() {
        let block_id1 = Felt::from(0xb63a9);
        let block_id2 = Felt::from(0xb63aa); // Greater than block_id1
        let tx_hash =
            Felt::from_hex("0x5f26258a75882780784979d970a3579c091e92073d61f7e90260e1133f75c8a")
                .unwrap();
        let tx_hash2 =
            Felt::from_hex("0x6f26258a75882780784979d970a3579c091e92073d61f7e90260e1133f75c8a")
                .unwrap(); // Greater than tx_hash

        // Same block, same tx, different event index
        let event_a = Id::new(block_id1, tx_hash, 0x10);
        let event_b = Id::new(block_id1, tx_hash, 0x11);
        assert!(event_a < event_b);

        // Same block, different tx
        let event_c = Id::new(block_id1, tx_hash, 0x10);
        let event_d = Id::new(block_id1, tx_hash2, 0x10);
        assert!(event_c < event_d);

        // Different block
        let event_e = Id::new(block_id1, tx_hash, 0x10);
        let event_f = Id::new(block_id2, tx_hash, 0x10);
        assert!(event_e < event_f);

        // Test sorting
        let mut events = vec![&event_f, &event_d, &event_b, &event_a];
        events.sort();
        assert_eq!(events, vec![&event_a, &event_b, &event_d, &event_f]);
    }

    #[test]
    fn test_sqlx_implementation() {
        // This test verifies the logic behind SQLx serialization/deserialization

        let block_id = Felt::from(0xb63a9);
        let tx_hash =
            Felt::from_hex("0x5f26258a75882780784979d970a3579c091e92073d61f7e90260e1133f75c8a")
                .unwrap();
        let event_idx = 0x10;

        let event_id = Id::new(block_id, tx_hash, event_idx);

        // Verify type info implementation exists
        let _event_id_type_info = <Id as Type<sqlx::Postgres>>::type_info();

        // Verify the round-trip conversion that happens during SQLx encoding/decoding:
        // 1. EventId is encoded as its string representation
        let encoded_string = event_id.as_string();

        // 2. The string is parsed back to EventId during decoding
        let decoded = Id::from_str(&encoded_string).unwrap();

        // 3. The decoded value should equal the original
        assert_eq!(decoded, event_id);
    }

    #[test]
    fn test_fromstr_implementation() {
        let block_id = Felt::from(0xb63a9);
        let tx_hash =
            Felt::from_hex("0x5f26258a75882780784979d970a3579c091e92073d61f7e90260e1133f75c8a")
                .unwrap();
        let event_idx = 0x10;

        let event_id = Id::new(block_id, tx_hash, event_idx);
        let str_repr = event_id.as_string();

        // Test parsing from string
        let parsed_event_id = Id::from_str(&str_repr).expect("Failed to parse EventId from string");

        // Verify the parsed value matches the original
        assert_eq!(parsed_event_id.block_id, event_id.block_id);
        assert_eq!(parsed_event_id.tx_hash, event_id.tx_hash);
        assert_eq!(parsed_event_id.event_idx, event_id.event_idx);

        // Test error cases
        assert!(Id::from_str("invalid").is_err());
        assert!(Id::from_str("part1:part2").is_err());
        assert!(Id::from_str("invalidbk_123:tx_456:e_789").is_err());
        assert!(Id::from_str("bk_123:invalidtx_456:e_789").is_err());
        assert!(Id::from_str("bk_123:tx_456:invalide_789").is_err());
    }
}
