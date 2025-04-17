use dojo_types::schema::Struct;
use serde::{Deserialize, Serialize};
use starknet::core::types::Felt;

use crate::get;

use crate::models::shared::EventPrint;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifierUpdatedEvent {
    new_verifier: Felt,
    old_verifier: Felt,
}

impl EventPrint for VerifierUpdatedEvent {
    fn pretty(&self) -> String {
        format!("🔒 Updated verifier to {:#x}", self.new_verifier)
    }
}

impl From<Struct> for VerifierUpdatedEvent {
    fn from(entity: Struct) -> Self {
        Self {
            new_verifier: get!(entity, "new_verifier", as_felt252),
            old_verifier: get!(entity, "old_verifier", as_felt252),
        }
    }
}
