use chrono::NaiveDateTime;
use ponziland_models::events::auth::AddressRemovedEvent;
use sqlx::prelude::FromRow;

use crate::{events::EventId, utils::date::naive_from_u64};

#[derive(Debug, Clone, FromRow)]
pub struct AddressRemovedEventModel {
    pub id: Option<EventId>,
    pub at: NaiveDateTime,
    pub address: String,
}

impl From<AddressRemovedEvent> for AddressRemovedEventModel {
    fn from(event: AddressRemovedEvent) -> Self {
        Self {
            id: None,
            at: naive_from_u64(event.authorized_at),
            address: format!("{:#x}", event.address),
        }
    }
}
