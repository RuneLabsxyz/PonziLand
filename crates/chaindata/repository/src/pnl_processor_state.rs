use crate::{Database, Error};
use chaindata_models::models::PnlProcessorState;
use sqlx::query_as;

pub struct Repository {
    db: Database,
}

impl Repository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get the last processed state
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn get_last_processed(&self) -> Result<PnlProcessorState, Error> {
        let state = query_as!(
            PnlProcessorState,
            r#"
            SELECT
                id,
                last_processed_timestamp as "last_processed_timestamp!",
                last_processed_event_id as "last_processed_event_id: _"
            FROM pnl_processor_state
            WHERE id = 1
            "#,
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?;

        Ok(state)
    }

    /// Update the last processed state
    ///
    /// # Errors
    /// Returns an error if the update fails.
    pub async fn update_last_processed(
        &self,
        last_processed_timestamp: &chrono::NaiveDateTime,
        last_processed_event_id: Option<&chaindata_models::events::EventId>,
    ) -> Result<(), Error> {
        sqlx::query!(
            r#"
            UPDATE pnl_processor_state
            SET last_processed_timestamp = $1,
                last_processed_event_id = $2
            WHERE id = 1
            "#,
            last_processed_timestamp,
            last_processed_event_id as _,
        )
        .execute(&mut *(self.db.acquire().await?))
        .await?;

        Ok(())
    }
}