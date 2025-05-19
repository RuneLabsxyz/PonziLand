use chrono::NaiveDateTime;
use ponziland_models::events::auth::AddressAuthorizedEvent;
use sqlx::prelude::FromRow;

use crate::{events::EventId, utils::date::naive_from_u64};

#[derive(Debug, Clone, FromRow)]
pub struct AddressAuthorizedEventModel {
    pub id: Option<EventId>,
    pub at: NaiveDateTime,
    pub address: String,
}

impl From<AddressAuthorizedEvent> for AddressAuthorizedEventModel {
    fn from(event: AddressAuthorizedEvent) -> Self {
        Self {
            id: None,
            at: naive_from_u64(event.authorized_at),
            address: format!("{:#x}", event.address),
        }
    }
}
