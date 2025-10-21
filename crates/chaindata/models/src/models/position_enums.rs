use serde::{Deserialize, Serialize};
use sqlx::Type;

//TODO:move to a utils or type folder
#[derive(Clone, Debug, PartialEq, PartialOrd, Type, Deserialize, Serialize)]
#[sqlx(type_name = "entry_type")]
pub enum EntryType {
    #[sqlx(rename = "AUCTION")]
    Auction,
    #[sqlx(rename = "BUY")]
    Buy,
}

#[derive(Clone, Debug, PartialEq, PartialOrd, Type, Deserialize, Serialize)]
#[sqlx(type_name = "exit_type")]
pub enum ExitType {
    #[sqlx(rename = "SOLD")]
    Sold,
    #[sqlx(rename = "NUKED")]
    Nuked,
}

#[derive(Clone, Debug, PartialEq, PartialOrd, Type, Deserialize, Serialize)]
#[sqlx(type_name = "position_status")]
pub enum PositionStatus {
    #[sqlx(rename = "ACTIVE")]
    Active,
    #[sqlx(rename = "CLOSED")]
    Closed,
}