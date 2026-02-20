use chaindata_models::{events::EventId, models::LandStakeModel, shared::Location};
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

    /// Saves a land stake model to the database
    ///
    /// # Errors
    ///
    /// Returns an error if the database operation fails.
    pub async fn save(&self, land_stake: LandStakeModel) -> Result<EventId, Error> {
        Ok(query!(
            r#"
            INSERT INTO land_stake (
                id, at, location, earliest_claim_neighbor_time, earliest_claim_neighbor_location, num_active_neighbors, amount
            )
            VALUES ($1, $2, $3, $4, $5,$6,$7)
            RETURNING id
            "#,
            land_stake.id as EventId,
            land_stake.at,
            land_stake.location as Location,
            land_stake.earliest_claim_neighbor_time ,
            land_stake.earliest_claim_neighbor_location as Location,
            land_stake.num_active_neighbors as i16,
            land_stake.amount as _
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?
        .id
        .parse()?)
    }

    /// Gets the latest land stake model at a specific location at or before the given timestamp
    ///
    /// # Errors
    ///
    /// Returns an error if the database operation fails.
    pub async fn get_latest_at_location(
        &self,
        location: Location,
        at: NaiveDateTime,
    ) -> Result<Option<LandStakeModel>, sqlx::Error> {
        query_as!(
            LandStakeModel,
            r#"
            SELECT
                id as "id: _",
                at,
                location as "location: Location",
                earliest_claim_neighbor_time,
                earliest_claim_neighbor_location as "earliest_claim_neighbor_location: Location",
                num_active_neighbors as "num_active_neighbors: i16",
                amount as "amount: _"
            FROM land_stake
            WHERE location = $1 AND at <= $2
            ORDER BY at DESC
            LIMIT 1
            "#,
            location as Location,
            at
        )
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets all land stakes that exist at a specific point in time
    ///
    /// # Errors
    ///
    /// Returns an error if the database operation fails.
    pub async fn get_all_at_time(
        &self,
        at: NaiveDateTime,
    ) -> Result<Vec<LandStakeModel>, sqlx::Error> {
        // This query gets the most recent version of each land stake at or before the specified time
        query_as!(
            LandStakeModel,
            r#"
            WITH latest_land_stakes AS (
                SELECT DISTINCT ON (location)
                    id, at, location, earliest_claim_neighbor_time, earliest_claim_neighbor_location, num_active_neighbors, amount
                FROM land_stake
                WHERE at <= $1
                ORDER BY location, at DESC
            )
            SELECT
                id as "id: _",
                at,
                location as "location: Location",
                earliest_claim_neighbor_time,
                earliest_claim_neighbor_location as "earliest_claim_neighbor_location: Location",
                num_active_neighbors as "num_active_neighbors: i16",
                amount as "amount: _"
            FROM latest_land_stakes
            "#,
            at
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets a land stake model by ID
    ///
    /// # Errors
    /// Returns an error if the database operation fails.
    pub async fn get_by_id(&self, id: EventId) -> Result<Option<LandStakeModel>, sqlx::Error> {
        query_as!(
            LandStakeModel,
            r#"
            SELECT
                id as "id: _",
                at,
                location as "location: Location",
                earliest_claim_neighbor_time,
                earliest_claim_neighbor_location as "earliest_claim_neighbor_location: Location",
                num_active_neighbors as "num_active_neighbors: i16",
                amount as "amount: _"
            FROM land_stake
            WHERE id = $1
            "#,
            id as EventId
        )
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets the latest timestamp from the `land_stake` table
    ///
    /// # Errors
    /// Returns an error if the database operation fails.
    pub async fn get_latest_timestamp(&self) -> Result<Option<NaiveDateTime>, sqlx::Error> {
        query!(
            r#"
            SELECT MAX(at) as latest_time
            FROM land_stake
            "#
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await
        .map(|row| row.latest_time)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chaindata_models::shared::U256;
    use chrono::Utc;
    use migrations::MIGRATOR;
    use std::str::FromStr;

    #[sqlx::test(migrator = "MIGRATOR")]
    #[ignore = "Test is using a database, only running it if wanted."]
    async fn test_save_and_get_land_stake(pool: sqlx::PgPool) -> Result<(), Error> {
        let repo = Repository::new(pool);

        // Create a test land stake model
        let location: Location = 1234.into();
        let neighbor_location: Location = 5678.into();
        let now = Utc::now().naive_utc();
        let last_pay_time = now - chrono::Duration::hours(1);
        let land_stake_model = LandStakeModel {
            id: EventId::new_test(0, 0, 0),
            at: now,
            location,
            earliest_claim_neighbor_time: last_pay_time,
            earliest_claim_neighbor_location: neighbor_location,
            num_active_neighbors: 0,
            amount: U256::from_str("1000").unwrap(),
        };

        // Save the land stake model
        let saved_id = repo.save(land_stake_model.clone()).await?;
        assert_eq!(saved_id, land_stake_model.id);

        // Retrieve the land stake model by ID
        let retrieved = repo.get_by_id(saved_id).await?;
        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, land_stake_model.id);
        assert_eq!(retrieved.location, land_stake_model.location);
        assert_eq!(
            retrieved
                .earliest_claim_neighbor_time
                .and_utc()
                .timestamp_micros(),
            land_stake_model
                .earliest_claim_neighbor_time
                .and_utc()
                .timestamp_micros()
        );
        assert_eq!(
            retrieved.earliest_claim_neighbor_location,
            land_stake_model.earliest_claim_neighbor_location
        );
        assert_eq!(
            retrieved.num_active_neighbors,
            land_stake_model.num_active_neighbors
        );
        assert_eq!(retrieved.amount, land_stake_model.amount);

        // Test get_latest_at_location
        let latest = repo.get_latest_at_location(location, now).await?;
        assert!(latest.is_some());
        let latest = latest.unwrap();
        assert_eq!(latest.id, land_stake_model.id);

        // Test getting land stake at a future time
        let future = now + chrono::Duration::hours(1);
        let future_latest = repo.get_latest_at_location(location, future).await?;
        assert!(future_latest.is_some());

        // Test getting land stake at a past time
        let past = now - chrono::Duration::hours(2);
        let past_latest = repo.get_latest_at_location(location, past).await?;
        assert!(past_latest.is_none());

        // Test get_all_at_time
        let all_land_stakes = repo.get_all_at_time(now).await?;
        assert!(!all_land_stakes.is_empty());
        assert!(all_land_stakes.iter().any(|l| l.id == land_stake_model.id));

        Ok(())
    }

    #[sqlx::test(migrator = "MIGRATOR")]
    #[ignore = "Test is using a database, only running it if wanted."]
    async fn test_land_stake_versioning(pool: sqlx::PgPool) -> Result<(), Error> {
        let repo = Repository::new(pool);

        // Create a location
        let location: Location = 5678.into();
        let neighbor_location: Location = 5679.into();

        // Create first version
        let time1 = Utc::now().naive_utc();
        let land_stake1 = LandStakeModel {
            id: EventId::new_test(0, 0, 1),
            at: time1,
            location,
            earliest_claim_neighbor_time: time1 - chrono::Duration::hours(1),
            earliest_claim_neighbor_location: neighbor_location,
            num_active_neighbors: 0,
            amount: U256::from_str("100").unwrap(),
        };
        repo.save(land_stake1.clone()).await?;

        // Create second version (one hour later)
        let time2 = time1 + chrono::Duration::hours(1);
        let land_stake2 = LandStakeModel {
            id: EventId::new_test(0, 0, 2),
            at: time2,
            location,
            earliest_claim_neighbor_time: time2, // Updated pay time
            earliest_claim_neighbor_location: neighbor_location,
            num_active_neighbors: 0,
            amount: U256::from_str("200").unwrap(), // Updated amount
        };
        repo.save(land_stake2.clone()).await?;

        // Test that we get the correct version at different times
        let v1 = repo.get_latest_at_location(location, time1).await?;
        assert!(v1.is_some());
        let v1 = v1.unwrap();
        assert_eq!(v1.id, land_stake1.id);
        assert_eq!(v1.amount, land_stake1.amount);

        let between = time1 + chrono::Duration::minutes(30);
        let v_between = repo.get_latest_at_location(location, between).await?;
        assert!(v_between.is_some());
        let v_between = v_between.unwrap();
        assert_eq!(
            v_between.id, land_stake1.id,
            "Should still get v1 for time between versions"
        );

        let v2 = repo.get_latest_at_location(location, time2).await?;
        assert!(v2.is_some());
        let v2 = v2.unwrap();
        assert_eq!(v2.id, land_stake2.id);
        assert_eq!(v2.amount, land_stake2.amount);

        // Test get_all_at_time returns the correct versions
        let all_at_time1 = repo.get_all_at_time(time1).await?;
        assert!(all_at_time1.iter().any(|l| l.id == land_stake1.id));
        assert!(!all_at_time1.iter().any(|l| l.id == land_stake2.id));

        let all_at_time2 = repo.get_all_at_time(time2).await?;
        assert!(all_at_time2
            .iter()
            .any(|l| l.location == land_stake2.location));
        assert!(all_at_time2.iter().any(|l| l.id == land_stake2.id));

        Ok(())
    }
}
