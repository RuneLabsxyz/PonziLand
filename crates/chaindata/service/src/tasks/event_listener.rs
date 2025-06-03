use std::sync::Arc;

use chaindata_models::events::{EventDataModel, EventId, FetchedEvent};
use chaindata_repository::event::Repository as EventRepository;
use chrono::Utc;
use ponziland_models::events::EventData;
use tokio::select;
use tokio_stream::StreamExt;
use torii_ingester::{RawToriiData, ToriiClient};
use tracing::{debug, error, info};

use crate::gg_xyz_api::{GGApi, PostRequest};

use super::Task;

/// `EventListenerTask` is a task that subscribes to the events of the on-chain indexer (torii),
/// and pushes them to the local database.
pub struct EventListenerTask {
    client: Arc<ToriiClient>,
    event_repository: Arc<EventRepository>,
    gg_api: Option<Arc<GGApi>>,
}

impl EventListenerTask {
    pub fn new(
        client: Arc<ToriiClient>,
        event_repository: Arc<EventRepository>,
        gg_api: Option<Arc<GGApi>>,
    ) -> Self {
        Self {
            client,
            event_repository,
            gg_api,
        }
    }

    async fn process_event(&self, event: RawToriiData) {
        // Parse and save the event
        let event = match event {
            RawToriiData::Grpc(data) => {
                debug!("Processing GRPC event");

                FetchedEvent {
                    id: EventId::new_test(0, 0, 0),
                    at: Utc::now().naive_utc(),
                    data: EventData::try_from(data)
                        .expect("An error occurred while deserializing model")
                        .into(),
                }
            }
            RawToriiData::Json {
                name,
                data,
                at,
                event_id,
            } => {
                debug!("Processing JSON event");

                FetchedEvent {
                    id: EventId::parse_from_torii(&event_id).unwrap(),
                    at: at.naive_utc(),
                    data: EventData::from_json(&name, data.clone())
                        .unwrap_or_else(|_| {
                            panic!(
                                "An error occurred while deserializing model for event {name}: {data:#?}"
                            )
                        })
                        .into(),
                }
            }
        };

        if let Err(error) = self.event_repository.save_event(event.clone()).await {
            error!("Failed to save event: {}", error);
            // Stop processing that evernt
            return;
        }
        info!("Successfully saved event!");

        if let Some(gg_api) = &self.gg_api {
            // If the event is used to submit something to gg, send it.
            let res: Option<Vec<(String, &'static str)>> = match event.data.clone() {
                EventDataModel::LandNuked(val) => Some(vec![(val.owner, "Land nuked")]),
                EventDataModel::AuctionFinished(val) => {
                    Some(vec![(val.buyer, "Bought from auction")])
                }
                EventDataModel::LandBought(val) => Some(vec![
                    (val.buyer, "Bought from player"),
                    (val.seller, "Sold land"),
                ]),
                EventDataModel::AddressAuthorized(val) => {
                    Some(vec![(val.address, "Joined the Ponzi")])
                }
                _ => None,
            };

            if let Some(values) = res {
                for (user, message) in values {
                    // Send the message to gg (don't really care about the response)
                    info!("Submitting action {message} for {user}");
                    if let Err(err) = gg_api
                        .send_actions(PostRequest {
                            address: user,
                            actions: vec![message.to_string()],
                        })
                        .await
                    {
                        error!("Error while sending message to gg: {}", err);
                    }
                }
            }
        }
    }
}

#[async_trait::async_trait]
impl Task for EventListenerTask {
    const NAME: &'static str = "EventListenerTask";

    async fn do_task(self: std::sync::Arc<Self>, mut rx: tokio::sync::oneshot::Receiver<()>) {
        info!("Starting EventListenerTask with 10-second polling interval");

        loop {
            // Poll for new events from the database
            let last_check = self
                .event_repository
                .get_last_event_date()
                .await
                .expect("Failed to get last event date");

            // Subtract 1 second to avoid missing events due to timestamp precision issues
            let safe_last_check = last_check - chrono::Duration::seconds(1);

            info!(
                "Polling for events after: {:?} (with 1s safety buffer)",
                safe_last_check
            );

            // Get all events that occurred after the last check (with safety buffer)
            let mut events_stream = self
                .client
                .get_all_events_after(safe_last_check)
                .expect("Error while fetching events");

            // Process events as they go
            let mut event_count = 0;
            while let Some(event) = events_stream.next().await {
                self.process_event(event).await;
                event_count += 1;
            }

            if event_count > 0 {
                info!("Processed {} new events", event_count);
            } else {
                debug!("No new events found");
            }

            // Wait for 10 seconds before the next poll (or until stop signal)
            select! {
                () = tokio::time::sleep(std::time::Duration::from_secs(10)) => {
                    debug!("Polling interval completed, checking for new events...");
                },
                stop_result = &mut rx => {
                    match stop_result {
                        Ok(()) => info!("Received stop signal, shutting down event processing"),
                        Err(e) => info!("Stop channel closed unexpectedly: {}", e),
                    }
                    return;
                }
            }
        }
    }
}
