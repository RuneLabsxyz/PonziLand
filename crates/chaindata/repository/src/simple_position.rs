use crate::{Database, Error};
use chaindata_models::{models::SimplePositionModel, shared::Location};
use chrono::NaiveDateTime;
use sqlx::{query, query_as};

pub struct Repository {
    db: Database,
}

impl Repository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Saves a simple position model to the database
    pub async fn save(&self, position: SimplePositionModel) -> Result<String, Error> {
        Ok(query!(
            r#"
            INSERT INTO simple_positions (id, at, owner, land_location, time_bought, close_date, close_reason)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET 
                at = EXCLUDED.at,
                close_date = EXCLUDED.close_date,
                close_reason = EXCLUDED.close_reason
            RETURNING id
            "#,
            position.id,
            position.at,
            position.owner,
            position.land_location as Location,
            position.time_bought,
            position.close_date,
            position.close_reason
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?
        .id)
    }

    /// Gets all positions for a specific owner
    pub async fn get_by_owner(&self, owner: &str) -> Result<Vec<SimplePositionModel>, sqlx::Error> {
        query_as!(
            SimplePositionModel,
            r#"
            SELECT
                id,
                at,
                owner,
                land_location as "land_location: Location",
                time_bought,
                close_date,
                close_reason
            FROM simple_positions
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
    ) -> Result<Vec<SimplePositionModel>, sqlx::Error> {
        query_as!(
            SimplePositionModel,
            r#"
            SELECT
                id,
                at,
                owner,
                land_location as "land_location: Location",
                time_bought,
                close_date,
                close_reason
            FROM simple_positions
            WHERE land_location = $1
            ORDER BY time_bought DESC
            "#,
            location as Location
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets the latest timestamp from the simple_positions table
    pub async fn get_latest_timestamp(&self) -> Result<Option<NaiveDateTime>, sqlx::Error> {
        query!(
            r#"
            SELECT MAX(at) as latest_time
            FROM simple_positions
            "#
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await
        .map(|row| row.latest_time)
    }

    /// Gets total count of positions for an owner
    pub async fn count_by_owner(&self, owner: &str) -> Result<i64, sqlx::Error> {
        query!(
            r#"
            SELECT COUNT(*) as count
            FROM simple_positions
            WHERE owner = $1
            "#,
            owner
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await
        .map(|row| row.count.unwrap_or(0))
    }

    /// Closes all open positions for a land location with the given reason
    pub async fn close_positions_by_land_location(
        &self,
        location: Location,
        close_date: NaiveDateTime,
        close_reason: &str,
    ) -> Result<u64, sqlx::Error> {
        query!(
            r#"
            UPDATE simple_positions
            SET close_date = $2, close_reason = $3
            WHERE land_location = $1 AND close_date IS NULL
            "#,
            location as Location,
            close_date,
            close_reason
        )
        .execute(&mut *(self.db.acquire().await?))
        .await
        .map(|result| result.rows_affected())
    }

    /// Gets all open positions for a land location (positions that haven't been closed)
    pub async fn get_open_positions_by_land_location(
        &self,
        location: Location,
    ) -> Result<Vec<SimplePositionModel>, sqlx::Error> {
        query_as!(
            SimplePositionModel,
            r#"
            SELECT
                id,
                at,
                owner,
                land_location as "land_location: Location",
                time_bought,
                close_date,
                close_reason
            FROM simple_positions
            WHERE land_location = $1 AND close_date IS NULL
            ORDER BY time_bought DESC
            "#,
            location as Location
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
    }
}
