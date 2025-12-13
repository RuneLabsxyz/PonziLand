use chrono::NaiveDateTime;
use sqlx::prelude::FromRow;
use sqlx::types::BigDecimal;

#[derive(Debug, Clone, FromRow)]
pub struct HistoricalPriceFeedModel {
    pub id: Option<i32>,
    pub symbol: String,
    pub price: BigDecimal,
    pub usd_ratio: Option<BigDecimal>,
    pub timestamp: NaiveDateTime,
}

impl HistoricalPriceFeedModel {
    #[must_use]
    pub fn new(
        symbol: String,
        price: BigDecimal,
        usd_ratio: Option<BigDecimal>,
        timestamp: NaiveDateTime,
    ) -> Self {
        Self {
            id: None,
            symbol,
            price,
            usd_ratio,
            timestamp,
        }
    }
}
