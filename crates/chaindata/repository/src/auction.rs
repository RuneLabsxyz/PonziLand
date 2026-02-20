use chaindata_models::{events::EventId, models::AuctionModel, shared::Location};
use chrono::NaiveDateTime;
use sqlx::{query, query_as};

use crate::{Database, Error};

pub struct Repository {
    db: Database,
}

impl Repository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Saves an auction model to the database
    ///
    /// # Errors
    /// Returns an error if the auction could not be saved.
    pub async fn save(&self, auction: AuctionModel) -> Result<EventId, Error> {
        Ok(query!(
            r#"
            INSERT INTO auction (
                id, at, location, start_time, start_price, floor_price, is_finished, decay_rate, sold_at_price
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
                at = EXCLUDED.at,
                is_finished = EXCLUDED.is_finished,
                sold_at_price = EXCLUDED.sold_at_price
            RETURNING id
            "#,
            auction.id as EventId,
            auction.at,
            auction.location as Location,
            auction.start_time,
            auction.start_price as _,
            auction.floor_price as _,
            auction.is_finished,
            auction.decay_rate,
            auction.sold_at_price as _
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?
        .id
        .parse()?)
    }

    /// Gets the latest auction at a specific location
    ///
    /// # Errors
    /// Returns an error if the auction could not be retrieved.
    pub async fn get_latest_at_location(
        &self,
        location: Location,
    ) -> Result<Option<AuctionModel>, sqlx::Error> {
        query_as!(
            AuctionModel,
            r#"
            SELECT
                id as "id: _",
                at,
                location as "location: Location",
                start_time,
                start_price as "start_price: _",
                floor_price as "floor_price: _",
                is_finished,
                decay_rate,
                sold_at_price as "sold_at_price: _"
            FROM auction
            WHERE location = $1
            ORDER BY at DESC
            LIMIT 1
            "#,
            location as Location
        )
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets all active (not finished) auctions
    ///
    /// # Errors
    /// Returns an error if the auctions could not be retrieved.
    pub async fn get_active_auctions(&self) -> Result<Vec<AuctionModel>, sqlx::Error> {
        query_as!(
            AuctionModel,
            r#"
            WITH latest_auctions AS (
                SELECT DISTINCT ON (location)
                    id, at, location, start_time, start_price, floor_price,
                    is_finished, decay_rate, sold_at_price
                FROM auction
                ORDER BY location, at DESC
            )
            SELECT
                id as "id: _",
                at,
                location as "location: Location",
                start_time,
                start_price as "start_price: _",
                floor_price as "floor_price: _",
                is_finished,
                decay_rate,
                sold_at_price as "sold_at_price: _"
            FROM latest_auctions
            WHERE is_finished = false
            "#
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets the latest timestamp from the auction table
    ///
    /// # Errors
    /// Returns an error if the latest timestamp could not be retrieved.
    pub async fn get_latest_timestamp(&self) -> Result<Option<NaiveDateTime>, sqlx::Error> {
        query!(
            r#"
            SELECT MAX(at) as latest_time
            FROM auction
            "#
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await
        .map(|row| row.latest_time)
    }
}
