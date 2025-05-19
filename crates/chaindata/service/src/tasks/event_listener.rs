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

        self.event_repository
            .save_event(event.clone())
            .await
            .expect("An error occurred while saving event");

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
        // Loop with a wait
        loop {
            // Start both a sql catch up and a torii event listener
            let last_check = self
                .event_repository
                .get_last_event_date()
                .await
                .expect("Too bad...");

            let events_catchup = self
                .client
                .get_all_events_after(last_check)
                .expect("Error while fetching entities");

            let events_listener = self
                .client
                .subscribe_events()
                .await
                .expect("Error while subscribing for events");

            // Join the two streams (on the heap to not anger the borrow checker)
            let mut events = Box::pin(events_catchup.merge(events_listener));

            // Process events
            loop {
                select! {
                    maybe_event = events.next() => {
                        if let Some(event) = maybe_event {
                            info!("Processing new event");
                            self.process_event(event).await;
                        } else {
                            info!("Event stream completed, exiting event processing loop before connecting again.");
                            break;
                        }
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

            // Wait for 10 seconds before connecting again (and check the stop result at the same time)
            select! {
                () = tokio::time::sleep(std::time::Duration::from_secs(10)) => {
                    info!("Finished waiting, catching up and logging in again...");
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
