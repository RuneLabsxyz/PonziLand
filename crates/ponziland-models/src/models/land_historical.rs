use crate::shared::Location;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use torii_ingester::prelude::ContractAddress;
use torii_ingester::u256::U256;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "text", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum CloseReason {
    #[sqlx(rename = "bought")]
    Bought,
    #[sqlx(rename = "nuked")]
    Nuked,
}

impl std::fmt::Display for CloseReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CloseReason::Bought => write!(f, "bought"),
            CloseReason::Nuked => write!(f, "nuked"),
        }
    }
}

impl std::str::FromStr for CloseReason {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "bought" => Ok(CloseReason::Bought),
            "nuked" => Ok(CloseReason::Nuked),
            _ => Err(format!("Invalid close reason: {}", s)),
        }
    }
}

/// Land historical tracking land ownership history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandHistorical {
    /// Unique identifier: owner_land_timestamp
    pub id: String,
    /// Wallet address of the owner (hex format)
    pub owner: String,
    /// Land location on the map
    pub land_location: Location,
    /// When this land was bought
    pub time_bought: NaiveDateTime,
    /// When this position was closed (if closed)
    pub close_date: Option<NaiveDateTime>,
    /// Reason for closure: "bought" or "nuked"
    pub close_reason: Option<CloseReason>,
    /// Cost to buy this land in token amount
    pub buy_cost_token: Option<U256>,
    /// Cost to buy this land in USD at time of purchase
    pub buy_cost_usd: Option<U256>,
    /// Token address used for purchase
    pub buy_token_used: Option<String>,
    /// Revenue from selling this land in token amount
    pub sale_revenue_token: Option<U256>,
    /// Revenue from selling this land in USD at time of sale
    pub sale_revenue_usd: Option<U256>,
    /// Token address used for sale
    pub sale_token_used: Option<String>,
    /// Token inflows to this land while the position was active (token address -> amount)
    pub token_inflows: HashMap<String, U256>,
    /// Token outflows from this land while the position was active (token address -> amount)
    pub token_outflows: HashMap<String, U256>,
}

impl LandHistorical {
    /// Create a new historical record from a land purchase
    pub fn new(
        owner: ContractAddress,
        land_location: Location,
        time_bought: NaiveDateTime,
    ) -> Self {
        let owner_hex = format!("{:#x}", owner);
        let id = format!(
            "{}_{}_{}",
            owner_hex,
            land_location,
            time_bought.and_utc().timestamp()
        );

        Self {
            id,
            owner: owner_hex,
            land_location,
            time_bought,
            close_date: None,
            close_reason: None,
            buy_cost_token: None,
            buy_cost_usd: None,
            buy_token_used: None,
            sale_revenue_token: None,
            sale_revenue_usd: None,
            sale_token_used: None,
            token_inflows: HashMap::new(),
            token_outflows: HashMap::new(),
        }
    }

    /// Create a new historical record with financial data
    pub fn new_with_cost(
        owner: ContractAddress,
        land_location: Location,
        time_bought: NaiveDateTime,
        buy_cost_token: Option<U256>,
        buy_cost_usd: Option<U256>,
        buy_token_used: Option<String>,
    ) -> Self {
        let owner_hex = format!("{:#x}", owner);
        let id = format!(
            "{}_{}_{}",
            owner_hex,
            land_location,
            time_bought.and_utc().timestamp()
        );

        Self {
            id,
            owner: owner_hex,
            land_location,
            time_bought,
            close_date: None,
            close_reason: None,
            buy_cost_token,
            buy_cost_usd,
            buy_token_used,
            sale_revenue_token: None,
            sale_revenue_usd: None,
            sale_token_used: None,
            token_inflows: HashMap::new(),
            token_outflows: HashMap::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use starknet::core::types::Felt;

    #[test]
    fn test_close_reason_display() {
        assert_eq!(CloseReason::Bought.to_string(), "bought");
        assert_eq!(CloseReason::Nuked.to_string(), "nuked");
    }

    #[test]
    fn test_close_reason_from_str() {
        assert_eq!(
            "bought".parse::<CloseReason>().unwrap(),
            CloseReason::Bought
        );
        assert_eq!("nuked".parse::<CloseReason>().unwrap(), CloseReason::Nuked);
        // Case insensitive
        assert_eq!(
            "BOUGHT".parse::<CloseReason>().unwrap(),
            CloseReason::Bought
        );
        assert_eq!("Nuked".parse::<CloseReason>().unwrap(), CloseReason::Nuked);
    }

    #[test]
    fn test_close_reason_from_str_invalid() {
        assert!("invalid".parse::<CloseReason>().is_err());
        assert!("".parse::<CloseReason>().is_err());
    }

    #[test]
    fn test_close_reason_roundtrip() {
        for reason in [CloseReason::Bought, CloseReason::Nuked] {
            let s = reason.to_string();
            let parsed: CloseReason = s.parse().unwrap();
            assert_eq!(parsed, reason);
        }
    }

    #[test]
    fn test_land_historical_new() {
        let owner = Felt::from_hex("0x1234").unwrap();
        let location = Location(2080);
        let time =
            NaiveDateTime::parse_from_str("2024-06-15 12:00:00", "%Y-%m-%d %H:%M:%S").unwrap();

        let record = LandHistorical::new(owner, location, time);

        assert!(record.id.contains("0x1234"));
        assert!(record.id.contains(&time.and_utc().timestamp().to_string()));
        assert_eq!(record.owner, format!("{:#x}", owner));
        assert_eq!(record.land_location, location);
        assert_eq!(record.time_bought, time);
        assert!(record.close_date.is_none());
        assert!(record.close_reason.is_none());
        assert!(record.buy_cost_token.is_none());
        assert!(record.buy_cost_usd.is_none());
        assert!(record.buy_token_used.is_none());
        assert!(record.sale_revenue_token.is_none());
        assert!(record.token_inflows.is_empty());
        assert!(record.token_outflows.is_empty());
    }

    #[test]
    fn test_land_historical_new_with_cost() {
        let owner = Felt::from_hex("0xabcd").unwrap();
        let location = Location(100);
        let time =
            NaiveDateTime::parse_from_str("2024-01-01 00:00:00", "%Y-%m-%d %H:%M:%S").unwrap();
        let cost = U256::from(1_000_000_u64);
        let token = "0x5678".to_string();

        let record = LandHistorical::new_with_cost(
            owner,
            location,
            time,
            Some(cost),
            None,
            Some(token.clone()),
        );

        assert_eq!(record.buy_cost_token, Some(cost));
        assert!(record.buy_cost_usd.is_none());
        assert_eq!(record.buy_token_used, Some(token));
        assert!(record.close_date.is_none());
        assert!(record.sale_revenue_token.is_none());
    }

    #[test]
    fn test_land_historical_id_format() {
        let owner = Felt::from_hex("0xff").unwrap();
        let location = Location(64); // coordinates: (1, 0)
        let time =
            NaiveDateTime::parse_from_str("2024-06-15 12:00:00", "%Y-%m-%d %H:%M:%S").unwrap();

        let record = LandHistorical::new(owner, location, time);

        // ID should be: owner_location_display_timestamp
        let expected_ts = time.and_utc().timestamp();
        assert!(record.id.ends_with(&expected_ts.to_string()));
        // Location Display is (x, y) format
        assert!(record.id.contains("(1, 0)"));
    }
}
