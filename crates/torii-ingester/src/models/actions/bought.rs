use dojo_types::schema::Struct;
use dojo_world::ContractAddress;
use serde::{Deserialize, Serialize};

use crate::get;

use crate::models::shared::{EventPrint, Location, U256};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LandBoughtEvent {
    buyer: ContractAddress,
    land_location: Location,

    sold_price: U256,
    seller: ContractAddress,
    token_used: ContractAddress,
}

impl EventPrint for LandBoughtEvent {
    fn pretty(&self) -> String {
        format!(
            "🔨 Land {} bought for {} by {}",
            self.land_location, self.sold_price, self.buyer
        )
    }
}

impl From<Struct> for LandBoughtEvent {
    fn from(entity: Struct) -> Self {
        Self {
            buyer: get!(entity, "buyer", as_contract_address),
            land_location: get!(entity, "land_location", as_location),

            sold_price: get!(entity, "sold_price", as_u256),
            seller: get!(entity, "seller", as_contract_address),
            token_used: get!(entity, "token_used", as_contract_address),
        }
    }
}
