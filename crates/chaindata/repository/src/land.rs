use crate::{Database, Error};
use chaindata_models::{events::EventId, models::LandModel, shared::Location};
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

    /// Saves a land model to the database
    /// # Errors
    /// Returns an error if the land could not be saved.
    pub async fn save(&self, land: LandModel) -> Result<EventId, Error> {
        Ok(query!(
            r#"
            INSERT INTO land (
                id, at, location, bought_at, owner, sell_price, token_used, level
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            "#,
            land.id as EventId,
            land.at,
            land.location as Location,
            land.bought_at,
            land.owner,
            land.sell_price as _,
            land.token_used,
            land.level as _
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?
        .id
        .parse()?)
    }

    /// Gets the latest land model at a specific location at or before the given timestamp
    /// # Errors
    /// Returns an error if the latest land could not be retrieved
    /// (for example, if the location is invalid, or if there is no land at that location)
    pub async fn get_latest_at_location(
        &self,
        location: Location,
        at: NaiveDateTime,
    ) -> Result<Option<LandModel>, sqlx::Error> {
        query_as!(
            LandModel,
            r#"
            SELECT
                id as "id: _",
                at,
                location as "location: Location",
                bought_at,
                owner,
                sell_price as "sell_price: _",
                token_used,
                level as "level: _"
            FROM land
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

    /// Gets all lands that exist at a specific point in time
    ///
    /// # Errors
    /// Returns an error if the lands could not be retrieved
    pub async fn get_all_at_time(&self, at: NaiveDateTime) -> Result<Vec<LandModel>, sqlx::Error> {
        // This query gets the most recent version of each land at or before the specified time
        query_as!(
            LandModel,
            r#"
            WITH latest_lands AS (
                SELECT DISTINCT ON (location)
                    id, at, location, bought_at, owner, sell_price, token_used, level
                FROM land
                WHERE at <= $1
                ORDER BY location, at DESC
            )
            SELECT
                id as "id: _",
                at,
                location as "location: Location",
                bought_at,
                owner,
                sell_price as "sell_price: _",
                token_used,
                level as "level: _"
            FROM latest_lands
            "#,
            at
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets a land model by ID
    ///
    /// # Errors
    /// Returns an error if the land could not be retrieved
    pub async fn get_by_id(&self, id: EventId) -> Result<Option<LandModel>, sqlx::Error> {
        query_as!(
            LandModel,
            r#"
            SELECT
                id as "id: _",
                at,
                location as "location: Location",
                bought_at,
                owner,
                sell_price as "sell_price: _",
                token_used,
                level as "level: _"
            FROM land
            WHERE id = $1
            "#,
            id as EventId
        )
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
    }

    /// Gets the latest timestamp from the land table
    ///
    /// # Errors
    /// Returns an error if the latest timestamp could not be retrieved
    pub async fn get_latest_timestamp(&self) -> Result<Option<NaiveDateTime>, sqlx::Error> {
        query!(
            r#"
            SELECT MAX(at) as latest_time
            FROM land
            "#
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await
        .map(|row| row.latest_time)
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use super::*;
    use chaindata_models::{
        models::Level,
        shared::{Location, U256},
    };
    use chrono::Utc;
    use migrations::MIGRATOR;

    #[sqlx::test(migrator = "MIGRATOR")]
    async fn test_save_and_get_land(pool: sqlx::PgPool) -> Result<(), Error> {
        let repo = Repository::new(pool);

        // Create a test land model
        let location: Location = 1234.into();
        let now = Utc::now().naive_utc();
        let land_model = LandModel {
            id: EventId::new_test(0, 0, 0),
            at: now,
            location,
            bought_at: now,
            owner: "0x123abc".to_string(),
            sell_price: U256::from_str("100").unwrap(),
            token_used: "0xtoken123".to_string(),
            level: Level::First,
        };

        // Save the land model
        let saved_id = repo.save(land_model.clone()).await?;
        assert_eq!(saved_id, land_model.id);

        // Retrieve the land model by ID
        let retrieved = repo.get_by_id(saved_id).await?;
        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, land_model.id);
        assert_eq!(retrieved.location, land_model.location);

        // Test get_latest_at_location
        let latest = repo.get_latest_at_location(location, now).await?;
        assert!(latest.is_some());
        let latest = latest.unwrap();
        assert_eq!(latest.id, land_model.id);

        // Test getting land at a future time
        let future = now + chrono::Duration::hours(1);
        let future_latest = repo.get_latest_at_location(location, future).await?;
        assert!(future_latest.is_some());

        // Test getting land at a past time
        let past = now - chrono::Duration::hours(1);
        let past_latest = repo.get_latest_at_location(location, past).await?;
        assert!(past_latest.is_none());

        // Test get_all_at_time
        let all_lands = repo.get_all_at_time(now).await?;
        assert!(!all_lands.is_empty());
        assert!(all_lands.iter().any(|l| l.id == land_model.id));

        Ok(())
    }

    #[sqlx::test(migrator = "MIGRATOR")]
    async fn test_land_versioning(pool: sqlx::PgPool) -> Result<(), Error> {
        let repo = Repository::new(pool);

        // Create a location
        let location: Location = 5678.into();

        // Create first version
        let time1 = Utc::now().naive_utc();
        let land1 = LandModel {
            id: EventId::new_test(0, 0, 1),
            at: time1,
            location,
            bought_at: time1,
            owner: "0xowner1".to_string(),
            sell_price: U256::from_str("100").unwrap(),
            token_used: "0xtoken1".to_string(),
            level: Level::Zero,
        };
        repo.save(land1.clone()).await?;

        // Create second version (one hour later)
        let time2 = time1 + chrono::Duration::hours(1);
        let land2 = LandModel {
            id: EventId::new_test(0, 0, 2),
            at: time2,
            location,
            bought_at: land1.bought_at,                 // Same bought time
            owner: "0xowner2".to_string(),              // New owner
            sell_price: U256::from_str("200").unwrap(), // New price
            token_used: land1.token_used.clone(),
            level: Level::First, // Upgraded
        };
        repo.save(land2.clone()).await?;

        // Test that we get the correct version at different times
        let v1 = repo.get_latest_at_location(location, time1).await?;
        assert!(v1.is_some());
        let v1 = v1.unwrap();
        assert_eq!(v1.id, land1.id);
        assert_eq!(v1.owner, land1.owner);

        let between = time1 + chrono::Duration::minutes(30);
        let v_between = repo.get_latest_at_location(location, between).await?;
        assert!(v_between.is_some());
        let v_between = v_between.unwrap();
        assert_eq!(
            v_between.id, land1.id,
            "Should still get v1 for time between versions"
        );

        let v2 = repo.get_latest_at_location(location, time2).await?;
        assert!(v2.is_some());
        let v2 = v2.unwrap();
        assert_eq!(v2.id, land2.id);
        assert_eq!(v2.owner, land2.owner);

        // Test get_all_at_time returns the correct versions
        let all_at_time1 = repo.get_all_at_time(time1).await?;
        assert!(all_at_time1.iter().any(|l| l.id == land1.id));
        assert!(!all_at_time1.iter().any(|l| l.id == land2.id));

        let all_at_time2 = repo.get_all_at_time(time2).await?;
        assert!(all_at_time2.iter().any(|l| l.location == land2.location));
        assert!(all_at_time2.iter().any(|l| l.id == land2.id));

        Ok(())
    }
}
