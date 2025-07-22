use serde::{Deserialize, Serialize};
use torii_ingester::{
    error::ToriiConversionError,
    get,
    prelude::{ContractAddress, Struct},
    u256::U256,
};

use crate::shared::Location;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct LandTransferEvent {
    pub from_location: Location,
    pub to_location: Location,
    pub token_address: ContractAddress,
    pub amount: U256,
}

impl TryFrom<Struct> for LandTransferEvent {
    type Error = ToriiConversionError;

    fn try_from(entity: Struct) -> Result<Self, Self::Error> {
        Ok(Self {
            from_location: get!(entity, "from_location", Location)?,
            to_location: get!(entity, "to_location", Location)?,
            token_address: get!(entity, "token_address", ContractAddress)?,
            amount: get!(entity, "amount", U256)?,
        })
    }
}
