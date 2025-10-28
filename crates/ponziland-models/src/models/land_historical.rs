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
