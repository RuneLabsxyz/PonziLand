use crate::{Database, Error};
use chaindata_models::{
    models::LandHistoricalModel,
    shared::{Location, U256},
};
use chrono::NaiveDateTime;
use ponziland_models::models::CloseReason;
use sqlx::{query, query_as};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct OwnerStats {
    pub count: i64,
    pub first_activity: Option<NaiveDateTime>,

#[derive(Debug, Clone)]
pub struct AuctionSpendSummary {
    pub auction_count: i64,
    pub total_spend: String,
    pub latest_time_bought: Option<NaiveDateTime>,
}

/// Repository for managing land historical records
pub struct Repository {
    db: Database,
}

impl Repository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Saves a land historical model to the database
    pub async fn save(&self, position: LandHistoricalModel) -> Result<String, Error> {
        Ok(query!(
            r#"
            INSERT INTO land_historical (
                id, at, owner, land_location, time_bought, close_date, close_reason,
                buy_cost_token, buy_cost_usd, buy_token_used,
                sale_revenue_token, sale_revenue_usd, sale_token_used,
                token_inflows, token_outflows
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO UPDATE SET 
                at = EXCLUDED.at,
                close_date = EXCLUDED.close_date,
                close_reason = EXCLUDED.close_reason,
                buy_cost_token = EXCLUDED.buy_cost_token,
                buy_cost_usd = EXCLUDED.buy_cost_usd,
                buy_token_used = EXCLUDED.buy_token_used,
                sale_revenue_token = EXCLUDED.sale_revenue_token,
                sale_revenue_usd = EXCLUDED.sale_revenue_usd,
                sale_token_used = EXCLUDED.sale_token_used,
                token_inflows = EXCLUDED.token_inflows,
                token_outflows = EXCLUDED.token_outflows
            RETURNING id
            "#,
            position.id,
            position.at,
            position.owner,
            position.land_location as Location,
            position.time_bought,
            position.close_date,
            position.close_reason as Option<CloseReason>,
            position.buy_cost_token as _,
            position.buy_cost_usd as _,
            position.buy_token_used,
            position.sale_revenue_token as _,
            position.sale_revenue_usd as _,
            position.sale_token_used,
            serde_json::to_value(&position.token_inflows.0).unwrap(),
            serde_json::to_value(&position.token_outflows.0).unwrap()
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?
        .id)
    }

    /// Gets all positions for a specific owner
    pub async fn get_by_owner(&self, owner: &str) -> Result<Vec<LandHistoricalModel>, sqlx::Error> {
        query_as!(
            LandHistoricalModel,
            r#"
            SELECT
                id,
                at,
                owner,
                land_location as "land_location: Location",
                time_bought,
                close_date,
                close_reason as "close_reason: CloseReason",
                buy_cost_token as "buy_cost_token: U256",
                buy_cost_usd as "buy_cost_usd: U256",
                buy_token_used,
                sale_revenue_token as "sale_revenue_token: U256",
                sale_revenue_usd as "sale_revenue_usd: U256",
                sale_token_used,
                token_inflows as "token_inflows: sqlx::types::Json<HashMap<String, U256>>",
                token_outflows as "token_outflows: sqlx::types::Json<HashMap<String, U256>>"
            FROM land_historical
            WHERE owner = $1
            ORDER BY time_bought DESC
            "#,
            owner
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets all positions for a specific land location
    pub async fn get_by_land_location(
        &self,
        location: Location,
    ) -> Result<Vec<LandHistoricalModel>, sqlx::Error> {
        query_as!(
            LandHistoricalModel,
            r#"
            SELECT
                id,
                at,
                owner,
                land_location as "land_location: Location",
                time_bought,
                close_date,
                close_reason as "close_reason: CloseReason",
                buy_cost_token as "buy_cost_token: U256",
                buy_cost_usd as "buy_cost_usd: U256",
                buy_token_used,
                sale_revenue_token as "sale_revenue_token: U256",
                sale_revenue_usd as "sale_revenue_usd: U256",
                sale_token_used,
                token_inflows as "token_inflows: sqlx::types::Json<HashMap<String, U256>>",
                token_outflows as "token_outflows: sqlx::types::Json<HashMap<String, U256>>"
            FROM land_historical
            WHERE land_location = $1
            ORDER BY time_bought DESC
            "#,
            location as Location
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets the latest timestamp from the land_historical table
    pub async fn get_latest_timestamp(&self) -> Result<Option<NaiveDateTime>, sqlx::Error> {
        query!(
            r#"
            SELECT MAX(at) as latest_time
            FROM land_historical
            "#
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await
        .map(|row| row.latest_time)
    }

    pub async fn get_owner_stats(&self, owner: &str) -> Result<OwnerStats, sqlx::Error> {
        query!(
            r#"
            SELECT COUNT(*) as count, MIN(time_bought) as first_activity
            FROM land_historical
            WHERE owner = $1
            "#,
            owner
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await
        .map(|row| OwnerStats {
            count: row.count.unwrap_or(0),
            first_activity: row.first_activity,
        })
    }

    /// Gets total auction spend (buy_token_used IS NULL) for an owner within a time range
    pub async fn get_auction_spend_by_owner(
        &self,
        owner: &str,
        start_time: NaiveDateTime,
        end_time: NaiveDateTime,
    ) -> Result<AuctionSpendSummary, sqlx::Error> {
        query!(
            r#"
            SELECT
                COUNT(*) as auction_count,
                COALESCE(SUM(CAST(buy_cost_token AS NUMERIC)), 0)::TEXT as total_spend,
                MAX(time_bought) as latest_time_bought
            FROM land_historical
            WHERE owner = $1
              AND buy_token_used IS NULL
              AND time_bought >= $2
              AND time_bought < $3
            "#,
            owner,
            start_time,
            end_time
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await
        .map(|row| AuctionSpendSummary {
            auction_count: row.auction_count.unwrap_or(0),
            total_spend: row.total_spend.unwrap_or_else(|| "0".to_string()),
            latest_time_bought: row.latest_time_bought,
        })
    }

    /// Closes all open positions for a land location with the given reason
    pub async fn close_positions_by_land_location(
        &self,
        location: Location,
        close_date: NaiveDateTime,
        close_reason: CloseReason,
    ) -> Result<u64, sqlx::Error> {
        query!(
            r#"
            UPDATE land_historical
            SET close_date = $2, close_reason = $3
            WHERE land_location = $1 AND close_date IS NULL
            "#,
            location as Location,
            close_date,
            close_reason as CloseReason
        )
        .execute(&mut *(self.db.acquire().await?))
        .await
        .map(|result| result.rows_affected())
    }

    /// Closes all open positions for a land location with sale revenue information
    pub async fn close_positions_by_land_location_with_sale(
        &self,
        location: Location,
        close_date: NaiveDateTime,
        close_reason: CloseReason,
        sale_revenue_token: Option<U256>,
        sale_revenue_usd: Option<U256>,
        sale_token_used: Option<&str>,
    ) -> Result<u64, sqlx::Error> {
        query!(
            r#"
            UPDATE land_historical
            SET close_date = $2, close_reason = $3,
                sale_revenue_token = $4, sale_revenue_usd = $5, sale_token_used = $6
            WHERE land_location = $1 AND close_date IS NULL
            "#,
            location as Location,
            close_date,
            close_reason as CloseReason,
            sale_revenue_token as _,
            sale_revenue_usd as _,
            sale_token_used
        )
        .execute(&mut *(self.db.acquire().await?))
        .await
        .map(|result| result.rows_affected())
    }

    /// Gets all open positions for a land location (positions that haven't been closed)
    pub async fn get_open_positions_by_land_location(
        &self,
        location: Location,
    ) -> Result<Vec<LandHistoricalModel>, sqlx::Error> {
        query_as!(
            LandHistoricalModel,
            r#"
            SELECT
                id,
                at,
                owner,
                land_location as "land_location: Location",
                time_bought,
                close_date,
                close_reason as "close_reason: CloseReason",
                buy_cost_token as "buy_cost_token: U256",
                buy_cost_usd as "buy_cost_usd: U256",
                buy_token_used,
                sale_revenue_token as "sale_revenue_token: U256",
                sale_revenue_usd as "sale_revenue_usd: U256",
                sale_token_used,
                token_inflows as "token_inflows: sqlx::types::Json<HashMap<String, U256>>",
                token_outflows as "token_outflows: sqlx::types::Json<HashMap<String, U256>>"
            FROM land_historical
            WHERE land_location = $1 AND close_date IS NULL
            ORDER BY time_bought DESC
            "#,
            location as Location
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets all closed positions since a given date (for leaderboard)
    pub async fn get_closed_positions_since(
        &self,
        since: NaiveDateTime,
    ) -> Result<Vec<LandHistoricalModel>, sqlx::Error> {
        query_as!(
            LandHistoricalModel,
            r#"
            SELECT
                id,
                at,
                owner,
                land_location as "land_location: Location",
                time_bought,
                close_date,
                close_reason as "close_reason: CloseReason",
                buy_cost_token as "buy_cost_token: U256",
                buy_cost_usd as "buy_cost_usd: U256",
                buy_token_used,
                sale_revenue_token as "sale_revenue_token: U256",
                sale_revenue_usd as "sale_revenue_usd: U256",
                sale_token_used,
                token_inflows as "token_inflows: sqlx::types::Json<HashMap<String, U256>>",
                token_outflows as "token_outflows: sqlx::types::Json<HashMap<String, U256>>"
            FROM land_historical
            WHERE time_bought >= $1
            ORDER BY time_bought DESC
            "#,
            since
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets all positions for multiple owners (for aggregate calculations)
    pub async fn get_by_owners(
        &self,
        owners: &[String],
    ) -> Result<Vec<LandHistoricalModel>, sqlx::Error> {
        let mut all_positions = Vec::new();

        for owner in owners {
            let positions = self.get_by_owner(owner).await?;
            all_positions.extend(positions);
        }

        all_positions.sort_by(|a, b| b.time_bought.cmp(&a.time_bought));

        Ok(all_positions)
    }
}
