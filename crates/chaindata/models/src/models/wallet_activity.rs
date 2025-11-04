use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct WalletActivityModel {
    pub id: Option<i32>,
    pub address: String,
    pub first_activity_at: NaiveDateTime,
    pub last_activity_at: NaiveDateTime,
    pub activity_count: i32,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

impl WalletActivityModel {
    pub fn new(address: String, activity_time: NaiveDateTime) -> Self {
        Self {
            id: None,
            address,
            first_activity_at: activity_time,
            last_activity_at: activity_time,
            activity_count: 1,
            created_at: None,
            updated_at: None,
        }
    }

    pub fn update_activity(&mut self, activity_time: NaiveDateTime) {
        self.last_activity_at = activity_time;
        self.activity_count += 1;
    }

    pub fn first_activity_utc(&self) -> DateTime<Utc> {
        self.first_activity_at.and_utc()
    }

    pub fn last_activity_utc(&self) -> DateTime<Utc> {
        self.last_activity_at.and_utc()
    }
}
