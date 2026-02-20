use chaindata_models::{models::AuctionModel, shared::Location};
use sqlx::QueryBuilder;

use crate::{Database, Error};

pub struct Repository {
    db: Database,
}

impl Repository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Saves an auction model to the database, upserting by location
    ///
    /// # Errors
    /// Returns an error if the database operation fails.
    pub async fn save(&self, auction: &AuctionModel) -> Result<(), Error> {
        let mut query = QueryBuilder::new(
            "INSERT INTO auction (id, at, location, start_time, start_price, floor_price, is_finished, decay_rate, sold_at_price) ",
        );

        query.push_values(std::iter::once(auction), |mut b, a| {
            b.push_bind(a.id.clone())
                .push_bind(a.at)
                .push_bind(a.location)
                .push_bind(a.start_time)
                .push_bind(a.start_price.clone())
                .push_bind(a.floor_price.clone())
                .push_bind(a.is_finished)
                .push_bind(a.decay_rate)
                .push_bind(a.sold_at_price.clone());
        });

        query
            .push(" ON CONFLICT (location) DO UPDATE SET ")
            .push("id = EXCLUDED.id, ")
            .push("at = EXCLUDED.at, ")
            .push("start_time = EXCLUDED.start_time, ")
            .push("start_price = EXCLUDED.start_price, ")
            .push("floor_price = EXCLUDED.floor_price, ")
            .push("is_finished = EXCLUDED.is_finished, ")
            .push("decay_rate = EXCLUDED.decay_rate, ")
            .push("sold_at_price = EXCLUDED.sold_at_price");

        query
            .build()
            .execute(&mut *(self.db.acquire().await?))
            .await?;

        Ok(())
    }

    /// Gets an auction by land location
    ///
    /// # Errors
    /// Returns an error if the database operation fails.
    pub async fn get_by_location(
        &self,
        location: Location,
    ) -> Result<Option<AuctionModel>, sqlx::Error> {
        sqlx::query_as::<_, AuctionModel>(
            r#"
            SELECT id, at, location, start_time, start_price, floor_price, is_finished, decay_rate, sold_at_price
            FROM auction
            WHERE location = $1
            "#,
        )
        .bind(location)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets all active (non-finished) auctions
    ///
    /// # Errors
    /// Returns an error if the database operation fails.
    pub async fn get_active_auctions(&self) -> Result<Vec<AuctionModel>, sqlx::Error> {
        sqlx::query_as::<_, AuctionModel>(
            r#"
            SELECT id, at, location, start_time, start_price, floor_price, is_finished, decay_rate, sold_at_price
            FROM auction
            WHERE is_finished = false
            ORDER BY start_time DESC
            "#,
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
    }
}
