use crate::{Database, Error};
use chaindata_models::models::WalletActivityModel;
use chrono::NaiveDateTime;
use sqlx::{query, query_as};

pub struct WalletActivityRepository {
    db: Database,
}

impl WalletActivityRepository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get active wallets, optionally filtered by weeks
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_active_wallets(
        &self,
        weeks_filter: Option<u32>,
    ) -> Result<Vec<WalletActivityModel>, Error> {
        if let Some(weeks) = weeks_filter {
            query_as!(
                WalletActivityModel,
                r#"
                SELECT 
                    id,
                    address,
                    first_activity_at,
                    last_activity_at,
                    activity_count,
                    created_at,
                    updated_at
                FROM wallet_activity
                WHERE last_activity_at >= (NOW() - INTERVAL '1 week' * $1)::timestamp
                ORDER BY activity_count DESC, last_activity_at DESC
                "#,
                weeks as f64
            )
            .fetch_all(&mut *(self.db.acquire().await?))
            .await
            .map_err(Error::from)
        } else {
            query_as!(
                WalletActivityModel,
                r#"
                SELECT 
                    id,
                    address,
                    first_activity_at,
                    last_activity_at,
                    activity_count,
                    created_at,
                    updated_at
                FROM wallet_activity
                ORDER BY activity_count DESC, last_activity_at DESC
                "#
            )
            .fetch_all(&mut *(self.db.acquire().await?))
            .await
            .map_err(Error::from)
        }
    }

    /// Get wallet activity count for a specific time period
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_active_wallet_count(&self, weeks_filter: Option<u32>) -> Result<i64, Error> {
        if let Some(weeks) = weeks_filter {
            let result = query!(
                r#"
                SELECT COUNT(*) as count
                FROM wallet_activity
                WHERE last_activity_at >= (NOW() - INTERVAL '1 week' * $1)::timestamp
                "#,
                weeks as f64
            )
            .fetch_one(&mut *(self.db.acquire().await?))
            .await?;

            Ok(result.count.unwrap_or(0))
        } else {
            let result = query!(
                r#"
                SELECT COUNT(*) as count
                FROM wallet_activity
                "#
            )
            .fetch_one(&mut *(self.db.acquire().await?))
            .await?;

            Ok(result.count.unwrap_or(0))
        }
    }

    /// Upsert wallet activity - creates new or updates existing
    ///
    /// # Errors
    /// Returns an error if the upsert fails
    pub async fn upsert_wallet_activity(
        &self,
        address: &str,
        _event_type: &str,
        activity_time: NaiveDateTime,
    ) -> Result<(), Error> {
        query!(
            r#"
            INSERT INTO wallet_activity (
                address, 
                first_activity_at, 
                last_activity_at, 
                activity_count
            )
            VALUES ($1, $2, $2, 1)
            ON CONFLICT (address) DO UPDATE SET
                last_activity_at = $2,
                activity_count = wallet_activity.activity_count + 1,
                updated_at = NOW()
            "#,
            address,
            activity_time
        )
        .execute(&mut *(self.db.acquire().await?))
        .await?;

        Ok(())
    }

    /// Get a specific wallet's activity
    ///
    /// # Errors
    /// Returns an error if the query fails
    pub async fn get_wallet_activity(
        &self,
        address: &str,
    ) -> Result<Option<WalletActivityModel>, Error> {
        let result = query_as!(
            WalletActivityModel,
            r#"
            SELECT 
                id,
                address,
                first_activity_at,
                last_activity_at,
                activity_count,
                created_at,
                updated_at
            FROM wallet_activity
            WHERE address = $1
            "#,
            address
        )
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await?;

        Ok(result)
    }
}
