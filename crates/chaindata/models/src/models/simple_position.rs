use bigdecimal::BigDecimal;
use chrono::NaiveDateTime;
use ponziland_models::models::SimplePosition;
use sqlx::prelude::FromRow;
use sqlx::types::BigDecimal as SqlxBigDecimal;
use std::str::FromStr;

use crate::shared::Location;

#[derive(Clone, Debug, FromRow)]
pub struct SimplePositionModel {
    pub id: String,
    pub at: NaiveDateTime,
    pub owner: String,
    pub land_location: Location,
    pub time_bought: NaiveDateTime,
    pub close_date: Option<NaiveDateTime>,
    pub close_reason: Option<String>,
    pub buy_cost_token: Option<SqlxBigDecimal>,
    pub buy_cost_usd: Option<SqlxBigDecimal>,
    pub buy_token_used: Option<String>,
    pub sale_revenue_token: Option<SqlxBigDecimal>,
    pub sale_revenue_usd: Option<SqlxBigDecimal>,
    pub sale_token_used: Option<String>,
}

impl SimplePositionModel {
    fn to_sqlx_bigdecimal(value: Option<BigDecimal>) -> Option<SqlxBigDecimal> {
        value.and_then(|v| SqlxBigDecimal::from_str(&v.to_string()).ok())
    }

    fn from_sqlx_bigdecimal(value: Option<SqlxBigDecimal>) -> Option<BigDecimal> {
        value.and_then(|v| BigDecimal::from_str(&v.to_string()).ok())
    }

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
            buy_cost_token: Self::to_sqlx_bigdecimal(position.buy_cost_token.clone()),
            buy_cost_usd: Self::to_sqlx_bigdecimal(position.buy_cost_usd.clone()),
            buy_token_used: position.buy_token_used.clone(),
            sale_revenue_token: Self::to_sqlx_bigdecimal(position.sale_revenue_token.clone()),
            sale_revenue_usd: Self::to_sqlx_bigdecimal(position.sale_revenue_usd.clone()),
            sale_token_used: position.sale_token_used.clone(),
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
            buy_cost_token: Self::from_sqlx_bigdecimal(self.buy_cost_token.clone()),
            buy_cost_usd: Self::from_sqlx_bigdecimal(self.buy_cost_usd.clone()),
            buy_token_used: self.buy_token_used.clone(),
            sale_revenue_token: Self::from_sqlx_bigdecimal(self.sale_revenue_token.clone()),
            sale_revenue_usd: Self::from_sqlx_bigdecimal(self.sale_revenue_usd.clone()),
            sale_token_used: self.sale_token_used.clone(),
        }
    }
}
