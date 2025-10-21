use crate::{events::base::EventDataRepository, Database, Error};
use chaindata_models::events::{Event, EventId, EventType, FetchedEvent};
use chrono::{DateTime, NaiveDateTime, Utc};
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

    /// Get events after a specific timestamp.
    ///
    /// # Errors
    /// Returns an error if the events could not be fetched.
    pub async fn get_events_after(&self, after: NaiveDateTime) -> Result<Vec<FetchedEvent>, Error> {
        // Get event IDs first
        let event_ids = query!(
            r#"
            SELECT id as "id: EventId"
            FROM event
            WHERE at > $1
            ORDER BY at ASC
            "#,
            after
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await?;

        // For each event ID, fetch the full event data
        let mut events = Vec::new();
        for event_id in event_ids {
            // Get the base event
            let base_event = query_as!(
                Event,
                r#"
                SELECT
                    id as "id: _",
                    at,
                    event_type as "event_type: _"
                FROM event
                WHERE id = $1
                "#,
                event_id.id as EventId
            )
            .fetch_one(&mut *(self.db.acquire().await?))
            .await?;

            // Get the event data by trying each event type
            let event_data = self.get_event_data_by_id(&base_event.id, &base_event.event_type).await?;

            events.push(FetchedEvent {
                id: base_event.id,
                at: base_event.at,
                data: event_data,
            });
        }

        Ok(events)
    }

    /// Helper method to get event data by ID and type
    ///
    /// # Errors
    /// Returns an error if the event data could not be fetched.
    async fn get_event_data_by_id(
        &self,
        event_id: &EventId,
        event_type: &EventType,
    ) -> Result<chaindata_models::events::EventDataModel, Error> {
        use chaindata_models::events::EventDataModel;
        use crate::events::event_data::EventModelRepository;

        // Match on event_type to know which table to query
        match event_type {
            EventType::AddStake => {
                if let Some(event) = <EventDataRepository as EventModelRepository<chaindata_models::events::actions::AddStakeEventModel>>::get_by_id(&mut *(self.db.acquire().await?), event_id.clone()).await? {
                    return Ok(EventDataModel::AddStake(event));
                }
            }
            EventType::AuctionFinished => {
                if let Some(event) = <EventDataRepository as EventModelRepository<chaindata_models::events::actions::AuctionFinishedEventModel>>::get_by_id(&mut *(self.db.acquire().await?), event_id.clone()).await? {
                    return Ok(EventDataModel::AuctionFinished(event));
                }
            }
            EventType::LandBought => {
                if let Some(event) = <EventDataRepository as EventModelRepository<chaindata_models::events::actions::LandBoughtEventModel>>::get_by_id(&mut *(self.db.acquire().await?), event_id.clone()).await? {
                    return Ok(EventDataModel::LandBought(event));
                }
            }
            EventType::LandNuked => {
                if let Some(event) = <EventDataRepository as EventModelRepository<chaindata_models::events::actions::LandNukedEventModel>>::get_by_id(&mut *(self.db.acquire().await?), event_id.clone()).await? {
                    return Ok(EventDataModel::LandNuked(event));
                }
            }
            EventType::NewAuction => {
                if let Some(event) = <EventDataRepository as EventModelRepository<chaindata_models::events::actions::NewAuctionEventModel>>::get_by_id(&mut *(self.db.acquire().await?), event_id.clone()).await? {
                    return Ok(EventDataModel::NewAuction(event));
                }
            }
            EventType::AddressAuthorized => {
                if let Some(event) = <EventDataRepository as EventModelRepository<chaindata_models::events::auth::AddressAuthorizedEventModel>>::get_by_id(&mut *(self.db.acquire().await?), event_id.clone()).await? {
                    return Ok(EventDataModel::AddressAuthorized(event));
                }
            }
            EventType::AddressRemoved => {
                if let Some(event) = <EventDataRepository as EventModelRepository<chaindata_models::events::auth::AddressRemovedEventModel>>::get_by_id(&mut *(self.db.acquire().await?), event_id.clone()).await? {
                    return Ok(EventDataModel::AddressRemoved(event));
                }
            }
            EventType::VerifierUpdated => {
                if let Some(event) = <EventDataRepository as EventModelRepository<chaindata_models::events::auth::VerifierUpdatedEventModel>>::get_by_id(&mut *(self.db.acquire().await?), event_id.clone()).await? {
                    return Ok(EventDataModel::VerifierUpdated(event));
                }
            }
            EventType::LandTransfer => {
                if let Some(event) = <EventDataRepository as EventModelRepository<chaindata_models::events::actions::LandTransferEventModel>>::get_by_id(&mut *(self.db.acquire().await?), event_id.clone()).await? {
                    return Ok(EventDataModel::LandTransfer(event));
                }
            }
        }

        Err(sqlx::Error::RowNotFound.into())
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
