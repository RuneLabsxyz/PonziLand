use crate::shared::Location;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use torii_ingester::u256::U256;

/// Drop land - a land injected with liquidity by the protocol (reinjector contract)
///
/// This struct represents a single drop with all its metrics.
/// All values are stored as String to be serializable and avoid trait bound issues.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DropLand {
    /// Land location on the map
    pub land_location: u32,

    /// Reinjector contract address (owner)
    pub owner: String,

    /// When this drop land was purchased by the reinjector
    pub time_bought: String,

    /// Initial stake injected by the protocol (= buy_cost_token at purchase)
    /// Stored as string representation of U256
    pub drop_initial_stake: String,

    /// Current remaining stake on this land (from land_stake table)
    /// Stored as string representation of U256
    pub drop_remaining_stake: String,

    /// Total tokens distributed to players from this drop
    /// = drop_initial_stake - drop_remaining_stake
    /// Stored as string representation of U256
    pub drop_distributed_total: String,

    /// Total taxes received from the 8 neighboring lands (player income into this land)
    /// Computed from sum of land_historical.token_inflows for this location
    /// Stored as string representation of U256
    pub neighbor_taxes_received: String,

    /// Total protocol fees earned from the 3x3 area (land + 8 neighbors)
    /// Includes:
    /// - Claim fees between lands in this area
    /// - Buy fees for lands in this area
    /// - Auction revenue for lands in this area
    /// Stored as string representation of U256
    pub area_protocol_fees_total: String,

    /// Return on investment for this drop
    /// = area_protocol_fees_total / drop_distributed_total
    /// Will be 0.0 if drop_distributed_total is 0
    pub drop_roi: f64,

    /// When this drop land was closed (if applicable)
    pub close_date: Option<String>,

    /// Whether this drop is currently active (no close_date)
    pub is_active: bool,
}
