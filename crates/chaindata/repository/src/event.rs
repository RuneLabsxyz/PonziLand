use crate::{events::base::EventDataRepository, Database, Error};
use chaindata_models::events::{Event, EventId, EventType, FetchedEvent};
use chrono::{DateTime, Utc};
use sqlx::{query, query_as};

pub struct Repository {
    db: Database,
}

impl Repository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get an event by its id.
    ///
    /// # Errors
    /// Returns an error if the event could not be fetched. Could be one of the following reasons:
    /// - No row was found
    /// - Error connecting to the database
    /// - Wrong format of id
    pub async fn get_event_by_id(&self, id: EventId) -> Result<Event, Error> {
        Ok(query_as!(
            Event,
            r#"
            SELECT
                id as "id: _",
                at,
                event_type as "event_type: _"
            FROM event
            WHERE id = $1
        "#,
            id as EventId
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?)
    }

    /// Get the last event date.
    ///
    /// # Errors
    /// Returns an error if the event could not be fetched. Could be one of the following reasons:
    /// - No row was found
    /// - Error connecting to the database
    /// - Wrong format of id
    pub async fn get_last_event_date(&self) -> Result<DateTime<Utc>, Error> {
        Ok(query!(
            r#"
            SELECT
                MAX(at)
            FROM event
        "#
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?
        .max
        .map_or(DateTime::UNIX_EPOCH, |date| date.and_utc()))
    }

    /// Saves an event into the database.
    ///
    /// # Errors
    /// Returns an error if the event could not be saved.
    pub async fn save_event(&self, event: FetchedEvent) -> Result<EventId, Error> {
        // Start a TX
        let mut tx = self.db.begin().await?;

        // Generate a new id
        let id = event.id;

        // Insert the event
        let id: EventId = query!(
            r#"
            INSERT INTO event (id, at, event_type)
            VALUES ($1, $2, $3)
            RETURNING id
        "#,
            id as EventId,
            event.at,
            EventType::from(&event.data) as EventType
        )
        .fetch_one(&mut *tx)
        .await?
        .id
        .parse()?;

        // Force the ID to be the same
        let mut event_data = event.data;
        event_data.set_id(id.clone());

        // Insert the event data
        EventDataRepository::save(&mut *tx, &event_data).await?;

        // Commit the TX
        tx.commit().await?;

        Ok(id)
    }
}
