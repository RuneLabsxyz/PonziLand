use crate::{Database, Error};
use chaindata_models::models::PositionEventLog;
use sqlx::query_as;

pub struct Repository {
    db: Database,
}

impl Repository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Append a log entry to the position event log
    ///
    /// # Errors
    /// Returns an error if the log entry could not be created.
    pub async fn append_log(&self, log: &PositionEventLog) -> Result<i32, Error> {
        let log_id = sqlx::query!(
            r#"
            INSERT INTO position_event_log (
                position_id, event_type, event_data, timestamp, blockchain_event_id
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING log_id
            "#,
            log.position_id,
            log.event_type,
            log.event_data,
            log.timestamp,
            log.blockchain_event_id as _
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?
        .log_id;

        Ok(log_id)
    }

    /// Get all logs for a position
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn get_logs_by_position(&self, position_id: i32) -> Result<Vec<PositionEventLog>, Error> {
        let logs = query_as!(
            PositionEventLog,
            r#"
            SELECT
                log_id,
                position_id,
                event_type,
                event_data,
                timestamp as "timestamp!",
                blockchain_event_id as "blockchain_event_id: _"
            FROM position_event_log
            WHERE position_id = $1
            ORDER BY timestamp ASC
            "#,
            position_id
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await?;

        Ok(logs)
    }

    /// Check if an event has already been processed (idempotency check)
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn is_event_processed(&self, blockchain_event_id: &chaindata_models::events::EventId) -> Result<bool, Error> {
        let result = sqlx::query!(
            r#"
            SELECT log_id
            FROM position_event_log
            WHERE blockchain_event_id = $1
            LIMIT 1
            "#,
            blockchain_event_id as _
        )
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await?;

        Ok(result.is_some())
    }
}