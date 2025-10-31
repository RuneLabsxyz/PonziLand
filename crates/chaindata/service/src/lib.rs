pub mod error;
pub mod tasks;

use chaindata_repository::{
    Database, EventRepository, LandHistoricalRepository, LandRepository, LandStakeRepository,
};
use serde::{Deserialize, Serialize};
use starknet::core::types::Felt;
use std::sync::Arc;
use tasks::{
    event_listener::EventListenerTask, land_historical_listener::LandHistoricalListenerTask,
    model_listener::ModelListenerTask, Task, TaskWrapper,
};
use tokio::sync::mpsc;
use torii_ingester::{ToriiClient, ToriiConfiguration};

/// `ChainDataService` is a service that handles the importation and syncing of new events and data
/// to the database for further processing.
pub struct ChainDataService {
    event_listener_task: TaskWrapper<EventListenerTask>,
    model_listener_task: TaskWrapper<ModelListenerTask>,
    land_historical_listener_task: TaskWrapper<LandHistoricalListenerTask>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChainDataServiceConfiguration {
    pub torii_url: String,
    pub world_address: Felt,
}

impl ChainDataService {
    /// Creates a new instance of `ChainDataService`
    ///
    /// # Errors
    /// Returns an error if the client cannot connect to the database.
    pub async fn new(
        database: Database,
        config: ChainDataServiceConfiguration,
    ) -> Result<Arc<Self>, error::Error> {
        let torii_config = ToriiConfiguration {
            base_url: config.torii_url.clone(),
            world_address: config.world_address,
        };

        let client = Arc::new(ToriiClient::new(&torii_config).await?);

        let event_repository = Arc::new(EventRepository::new(database.clone()));
        let land_repository = Arc::new(LandRepository::new(database.clone()));
        let land_stake_repository = Arc::new(LandStakeRepository::new(database.clone()));
        let land_historical_repository = Arc::new(LandHistoricalRepository::new(database.clone()));

        // Create a broadcast channel for event communication
        let (event_sender, event_receiver) = mpsc::channel(10);

        Ok(Arc::new(Self {
            event_listener_task: EventListenerTask::new(
                client.clone(),
                event_repository,
                event_sender,
            )
            .wrap(),
            model_listener_task: ModelListenerTask::new(
                client.clone(),
                land_repository,
                land_stake_repository,
            )
            .wrap(),
            land_historical_listener_task: LandHistoricalListenerTask::new(
                event_receiver,
                land_historical_repository,
            )
            .wrap(),
        }))
    }

    pub fn stop(self: &Arc<Self>) {
        self.event_listener_task.stop();
        self.model_listener_task.stop();
        self.land_historical_listener_task.stop();
    }

    pub fn start(self: &Arc<Self>) {
        // Start all in parallel
        self.event_listener_task.start();
        self.model_listener_task.start();
        self.land_historical_listener_task.start();
    }
}
