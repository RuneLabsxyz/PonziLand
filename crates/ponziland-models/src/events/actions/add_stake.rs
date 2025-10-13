use serde::{Deserialize, Serialize};
use torii_ingester::{
    error::ToriiConversionError,
    get,
    prelude::{ContractAddress, Struct},
    u256::U256,
};

use crate::shared::Location;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddStakeEvent {
    pub land_location: Location,
    pub new_stake_amount: U256,
    pub owner: ContractAddress,
}

impl TryFrom<Struct> for AddStakeEvent {
    type Error = ToriiConversionError;

    fn try_from(entity: Struct) -> Result<Self, Self::Error> {
        Ok(Self {
            land_location: get!(entity, "land_location", Location)?,
            new_stake_amount: get!(entity, "new_stake_amount", U256)?,
            owner: get!(entity, "owner", ContractAddress)?,
        })
    }
}
