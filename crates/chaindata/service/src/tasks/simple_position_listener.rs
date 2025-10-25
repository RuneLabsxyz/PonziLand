use std::sync::Arc;

use chaindata_models::events::actions::{
    AuctionFinishedEventModel, LandBoughtEventModel, LandNukedEventModel,
};
use chaindata_models::{
    events::{EventDataModel, EventId},
    models::SimplePositionModel,
};
use chaindata_repository::SimplePositionRepository;
use chrono::{DateTime, Utc};
use ponziland_models::models::SimplePosition;
use tokio::select;
use tokio_stream::StreamExt;
use torii_ingester::{RawToriiData, ToriiClient};
use tracing::{debug, error, info};

use super::Task;

/// `SimplePositionListenerTask` tracks land ownership history
///
/// This task processes:
/// - `LandBoughtEvent` - Records land purchases and closes previous positions
/// - `AuctionFinishedEvent` - Records auction wins and closes previous positions
/// - `LandNukedEvent` - Closes positions when land is nuked
pub struct SimplePositionListenerTask {
    client: Arc<ToriiClient>,
    simple_position_repository: Arc<SimplePositionRepository>,
}

impl SimplePositionListenerTask {
    pub fn new(
        client: Arc<ToriiClient>,
        simple_position_repository: Arc<SimplePositionRepository>,
    ) -> Self {
        Self {
            client,
            simple_position_repository,
        }
    }

    /// Gets the most recent update time from simple position records
    async fn get_last_simple_position_update_time(&self) -> Result<DateTime<Utc>, sqlx::Error> {
        let position_latest = self
            .simple_position_repository
            .get_latest_timestamp()
            .await?
            .unwrap_or(DateTime::UNIX_EPOCH.naive_utc());

        Ok(position_latest.and_utc())
    }

    async fn process_event(
        &self,
        event_data: EventDataModel,
        _event_id: EventId,
        at: DateTime<Utc>,
    ) {
        match event_data {
            EventDataModel::LandBought(land_bought) => {
                if let Err(e) = self.handle_land_bought(land_bought, at).await {
                    error!("Failed to handle land bought event: {}", e);
                }
            }
            EventDataModel::AuctionFinished(auction_finished) => {
                if let Err(e) = self.handle_auction_finished(auction_finished, at).await {
                    error!("Failed to handle auction finished event: {}", e);
                }
            }
            EventDataModel::LandNuked(land_nuked) => {
                if let Err(e) = self.handle_land_nuked(land_nuked, at).await {
                    error!("Failed to handle land nuked event: {}", e);
                }
            }
            _ => {
                // We only care about land ownership events for simple position tracking
                debug!("Ignoring non-position event");
            }
        }
    }

    async fn handle_land_bought(
        &self,
        event: LandBoughtEventModel,
        at: DateTime<Utc>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let location = event.location;
        let buyer = event.buyer.clone();

        // Don't create a position if buyer is zero address (initial auction)
        if buyer == "0x0" || buyer == "0" {
            debug!("Skipping position creation for zero address buyer");
            return Ok(());
        }

        // Close all previous positions for this land location
        let closed_count = self
            .simple_position_repository
            .close_positions_by_land_location((*location).into(), at.naive_utc(), "bought")
            .await
            .map_err(|e| {
                error!("Failed to close previous positions for land bought: {}", e);
                e
            })?;

        if closed_count > 0 {
            info!(
                "Closed {} previous position(s) for land at location {:?} (bought)",
                closed_count, location
            );
        }

        // Create simple position for the buyer
        let position = SimplePosition::new(buyer.parse()?, (*location).into(), at.naive_utc());

        let position_model = SimplePositionModel::from_simple_position(&position, at.naive_utc());

        info!(
            "Recording land purchase: {} bought land at location {:?} at {}",
            buyer, location, at
        );

        if let Err(e) = self.simple_position_repository.save(position_model).await {
            error!("Failed to save simple position: {}", e);
            return Err(e.into());
        }

        Ok(())
    }

    async fn handle_auction_finished(
        &self,
        event: AuctionFinishedEventModel,
        at: DateTime<Utc>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let location = event.location;
        let buyer = event.buyer.clone();

        // Don't create a position if buyer is zero address
        if buyer == "0x0" || buyer == "0" {
            debug!("Skipping position creation for zero address auction winner");
            return Ok(());
        }

        // Close all previous positions for this land location
        let closed_count = self
            .simple_position_repository
            .close_positions_by_land_location((*location).into(), at.naive_utc(), "bought")
            .await
            .map_err(|e| {
                error!(
                    "Failed to close previous positions for auction finished: {}",
                    e
                );
                e
            })?;

        if closed_count > 0 {
            info!(
                "Closed {} previous position(s) for land at location {:?} (auction won)",
                closed_count, location
            );
        }

        // Create simple position for the auction winner
        let position = SimplePosition::new(buyer.parse()?, (*location).into(), at.naive_utc());

        let position_model = SimplePositionModel::from_simple_position(&position, at.naive_utc());

        info!(
            "Recording auction win: {} won auction for land at location {:?} at {}",
            buyer, location, at
        );

        if let Err(e) = self.simple_position_repository.save(position_model).await {
            error!("Failed to save simple auction position: {}", e);
            return Err(e.into());
        }

        Ok(())
    }

    async fn handle_land_nuked(
        &self,
        event: LandNukedEventModel,
        at: DateTime<Utc>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let location = event.location;

        // Close all open positions for this land location due to nuking
        let closed_count = self
            .simple_position_repository
            .close_positions_by_land_location((*location).into(), at.naive_utc(), "nuked")
            .await
            .map_err(|e| {
                error!("Failed to close positions for land nuked: {}", e);
                e
            })?;

        info!(
            "Closed {} position(s) for land at location {:?} (nuked) at {}",
            closed_count, location, at
        );

        Ok(())
    }
}

#[async_trait::async_trait]
impl Task for SimplePositionListenerTask {
    const NAME: &'static str = "SimplePositionListenerTask";

    async fn do_task(self: std::sync::Arc<Self>, mut rx: tokio::sync::oneshot::Receiver<()>) {
        info!("Starting SimplePositionListenerTask with 10-second polling interval");

        loop {
            // Get the last time we processed position-related events
            let last_check = match self.get_last_simple_position_update_time().await {
                Ok(time) => time,
                Err(e) => {
                    error!("Failed to get last simple position update time: {}", e);
                    tokio::time::sleep(std::time::Duration::from_secs(10)).await;
                    continue;
                }
            };

            // Add safety buffer to avoid missing events due to timestamp precision
            let safe_last_check = last_check - chrono::Duration::seconds(5);

            info!(
                "Polling for land ownership events after: {:?} (with 5s safety buffer)",
                safe_last_check
            );

            // Get all events after the last check
            let events_stream = match self.client.get_all_events_after(safe_last_check) {
                Ok(stream) => stream,
                Err(e) => {
                    error!("Failed to get events stream: {}", e);
                    tokio::time::sleep(std::time::Duration::from_secs(10)).await;
                    continue;
                }
            };

            // Process events
            let mut event_count = 0;
            let mut position_event_count = 0;

            tokio::pin!(events_stream);

            while let Some(raw_event) = events_stream.next().await {
                event_count += 1;

                // Parse the event
                let (event_data, event_id, at) = match raw_event {
                    RawToriiData::Json {
                        name,
                        data,
                        event_id,
                        at,
                    } => match ponziland_models::events::EventData::from_json(&name, data) {
                        Ok(event_data) => (
                            event_data.into(),
                            EventId::parse_from_torii(&event_id)
                                .unwrap_or_else(|_| EventId::new_test(0, 0, 0)),
                            at,
                        ),
                        Err(e) => {
                            debug!("Failed to parse event {}: {}", name, e);
                            continue;
                        }
                    },
                    RawToriiData::Grpc(structure) => {
                        match ponziland_models::events::EventData::try_from(structure) {
                            Ok(event_data) => (
                                event_data.into(),
                                EventId::new_test(0, 0, 0), // GRPC events don't have IDs yet
                                Utc::now(),
                            ),
                            Err(e) => {
                                debug!("Failed to parse GRPC event: {}", e);
                                continue;
                            }
                        }
                    }
                };

                // Only process land ownership events
                match &event_data {
                    EventDataModel::LandBought(_)
                    | EventDataModel::AuctionFinished(_)
                    | EventDataModel::LandNuked(_) => {
                        position_event_count += 1;
                        self.process_event(event_data, event_id, at).await;
                    }
                    _ => {
                        // Skip non-ownership events
                        continue;
                    }
                }
            }

            if event_count > 0 {
                info!(
                    "Processed {} events ({} land ownership events) for simple position tracking",
                    event_count, position_event_count
                );
            } else {
                debug!("No new events found for simple position tracking");
            }

            // Wait for 10 seconds before the next poll (or until stop signal)
            select! {
                () = tokio::time::sleep(std::time::Duration::from_secs(10)) => {
                    debug!("Polling interval completed, checking for new land ownership events...");
                },
                stop_result = &mut rx => {
                    match stop_result {
                        Ok(()) => info!("Received stop signal, shutting down simple position tracking"),
                        Err(e) => info!("Stop channel closed unexpectedly: {}", e),
                    }
                    return;
                }
            }
        }
    }
}
