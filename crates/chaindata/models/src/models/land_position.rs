use crate::events::EventId;
use crate::shared::{Location, U256};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;

use super::position_enums::{EntryType, ExitType, PositionStatus};


//TODO:see if we want to move this another folder like pnl or something
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LandPosition {
    pub position_id: i32,
    pub land_location: Location,
    pub owner_address: String,
    pub token_used: String,

    // Entry fields
    pub entry_price: U256,
    pub entry_token: String,
    pub entry_type: EntryType,
    pub entry_timestamp: NaiveDateTime,
    pub entry_event_id: EventId,

    // Stake fields
    pub initial_stake: U256,
    pub total_stake_added: U256,

    // Taxes fields
    pub taxes_earned_by_token: Value, // JSONB
    pub taxes_paid_amount: U256,

    // Fees fields
    pub total_buy_fee: U256,
    pub total_claim_fees: U256,

    // Exit fields (nullable)
    pub exit_price: Option<U256>,
    pub stake_refunded: Option<U256>,
    pub exit_timestamp: Option<NaiveDateTime>,
    pub exit_type: Option<ExitType>,
    pub exit_event_id: Option<EventId>,

    // Status
    pub status: PositionStatus,

    // USD Valuation
    pub value_in_usdc: Option<U256>,
}