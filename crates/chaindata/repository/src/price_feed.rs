use crate::{Database, Error};
use chaindata_models::models::HistoricalPriceFeedModel;
use chrono::NaiveDateTime;
use sqlx::types::BigDecimal;
use sqlx::{query, query_as};

pub struct PriceFeedRepository {
    db: Database,
}

impl PriceFeedRepository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Insert a new price feed entry
    ///
    /// # Errors
    /// Returns an error if the insert fails
    pub async fn insert(
        &self,
        symbol: &str,
        price: BigDecimal,
        usd_ratio: Option<BigDecimal>,
        timestamp: NaiveDateTime,
    ) -> Result<(), Error> {
        query!(
            r#"
            INSERT INTO historical_price_feed (symbol, price, usd_ratio, timestamp)
            VALUES ($1, $2, $3, $4)
            "#,
            symbol,
            price,
            usd_ratio,
            timestamp
        )
        .execute(&mut *(self.db.acquire().await?))
        .await?;

        Ok(())
    }

    /// Get the latest price for a symbol
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_latest_by_symbol(
        &self,
        symbol: &str,
    ) -> Result<Option<HistoricalPriceFeedModel>, Error> {
        let result = query_as!(
            HistoricalPriceFeedModel,
            r#"
            SELECT id, symbol, price, usd_ratio, timestamp
            FROM historical_price_feed
            WHERE symbol = $1
            ORDER BY timestamp DESC
            LIMIT 1
            "#,
            symbol
        )
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await?;

        Ok(result)
    }

    /// Get prices for a symbol within a time range
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_by_symbol_in_range(
        &self,
        symbol: &str,
        start: NaiveDateTime,
        end: NaiveDateTime,
    ) -> Result<Vec<HistoricalPriceFeedModel>, Error> {
        let results = query_as!(
            HistoricalPriceFeedModel,
            r#"
            SELECT id, symbol, price, usd_ratio, timestamp
            FROM historical_price_feed
            WHERE symbol = $1 AND timestamp >= $2 AND timestamp <= $3
            ORDER BY timestamp ASC
            "#,
            symbol,
            start,
            end
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await?;

        Ok(results)
    }

    /// Get all unique symbols
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_all_symbols(&self) -> Result<Vec<String>, Error> {
        let results = query!(
            r#"
            SELECT DISTINCT symbol
            FROM historical_price_feed
            ORDER BY symbol ASC
            "#
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await?;

        Ok(results.into_iter().map(|r| r.symbol).collect())
    }

    /// Get latest prices for all symbols
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_latest_all(&self) -> Result<Vec<HistoricalPriceFeedModel>, Error> {
        let results = query_as!(
            HistoricalPriceFeedModel,
            r#"
            SELECT DISTINCT ON (symbol) id, symbol, price, usd_ratio, timestamp
            FROM historical_price_feed
            ORDER BY symbol, timestamp DESC
            "#
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await?;

        Ok(results)
    }
}
