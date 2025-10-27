use chrono::NaiveDateTime;
use ponziland_models::models::SimplePosition;
use sqlx::prelude::FromRow;
use sqlx::types::Json;
use std::collections::HashMap;

use crate::shared::{Location, U256};

#[derive(Clone, Debug, FromRow)]
pub struct SimplePositionModel {
    pub id: String,
    pub at: NaiveDateTime,
    pub owner: String,
    pub land_location: Location,
    pub time_bought: NaiveDateTime,
    pub close_date: Option<NaiveDateTime>,
    pub close_reason: Option<String>,
    pub buy_cost_token: Option<U256>,
    pub buy_cost_usd: Option<U256>,
    pub buy_token_used: Option<String>,
    pub sale_revenue_token: Option<U256>,
    pub sale_revenue_usd: Option<U256>,
    pub sale_token_used: Option<String>,
    pub token_inflows: Json<HashMap<String, U256>>,
    pub token_outflows: Json<HashMap<String, U256>>,
}

impl SimplePositionModel {
    /// Create a new SimplePositionModel from a SimplePosition
    pub fn from_simple_position(position: &SimplePosition, at: NaiveDateTime) -> Self {
        Self {
            id: position.id.clone(),
            at,
            owner: position.owner.clone(),
            land_location: Location::from(position.land_location),
            time_bought: position.time_bought,
            close_date: position.close_date,
            close_reason: position.close_reason.clone(),
            buy_cost_token: position.buy_cost_token.map(|v| U256::from(v)),
            buy_cost_usd: position.buy_cost_usd.map(|v| U256::from(v)),
            buy_token_used: position.buy_token_used.clone(),
            sale_revenue_token: position.sale_revenue_token.map(|v| U256::from(v)),
            sale_revenue_usd: position.sale_revenue_usd.map(|v| U256::from(v)),
            sale_token_used: position.sale_token_used.clone(),
            token_inflows: Json(
                position
                    .token_inflows
                    .iter()
                    .map(|(k, v)| (k.clone(), U256::from(*v)))
                    .collect()
            ),
            token_outflows: Json(
                position
                    .token_outflows
                    .iter()
                    .map(|(k, v)| (k.clone(), U256::from(*v)))
                    .collect()
            ),
        }
    }

    /// Convert this model back to a SimplePosition
    pub fn to_simple_position(&self) -> SimplePosition {
        SimplePosition {
            id: self.id.clone(),
            owner: self.owner.clone(),
            land_location: (*self.land_location).into(),
            time_bought: self.time_bought,
            close_date: self.close_date,
            close_reason: self.close_reason.clone(),
            buy_cost_token: self.buy_cost_token.map(|v| *v),
            buy_cost_usd: self.buy_cost_usd.map(|v| *v),
            buy_token_used: self.buy_token_used.clone(),
            sale_revenue_token: self.sale_revenue_token.map(|v| *v),
            sale_revenue_usd: self.sale_revenue_usd.map(|v| *v),
            sale_token_used: self.sale_token_used.clone(),
            token_inflows: self
                .token_inflows
                .0
                .iter()
                .map(|(k, v)| (k.clone(), **v))
                .collect(),
            token_outflows: self
                .token_outflows
                .0
                .iter()
                .map(|(k, v)| (k.clone(), **v))
                .collect(),
        }
    }
}
