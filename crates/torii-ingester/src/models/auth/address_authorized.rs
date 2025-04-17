use dojo_types::schema::Struct;
use dojo_world::ContractAddress;
use serde::{Deserialize, Serialize};

use crate::get;

use crate::models::shared::EventPrint;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddressAuthorizedEvent {
    address: ContractAddress,
    authorized_at: u64,
}

impl EventPrint for AddressAuthorizedEvent {
    fn pretty(&self) -> String {
        format!("🔒 Address authorized: {}", self.address)
    }
}

impl From<Struct> for AddressAuthorizedEvent {
    fn from(entity: Struct) -> Self {
        Self {
            address: get!(entity, "address", as_contract_address),
            authorized_at: get!(entity, "authorized_at", as_u64),
        }
    }
}
