pub mod error;
pub mod gg_xyz_api;
pub mod tasks;

use chaindata_repository::{Database, EventRepository, LandPositionRepository, LandRepository, LandStakeRepository, PnlProcessorStateRepository, PositionEventLogRepository};
use gg_xyz_api::GGApi;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use starknet::core::types::Felt;
use std::sync::Arc;
use tasks::{
    event_listener::EventListenerTask, model_listener::ModelListenerTask, pnl_processor::PnlProcessorTask, Task, TaskWrapper,
};
use torii_ingester::{ToriiClient, ToriiConfiguration};

/// `ChainDataService` is a service that handles the importation and syncing of new events and data
/// to the database for further processing.
pub struct ChainDataService {
    event_listener_task: TaskWrapper<EventListenerTask>,
    model_listener_task: TaskWrapper<ModelListenerTask>,
    pnl_processor_task: TaskWrapper<PnlProcessorTask>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChainDataServiceConfiguration {
    pub torii_url: String,
    pub world_address: Felt,
    pub gg_xyz_enabled: bool,
    pub gg_xyz_api_key: String,
    pub gg_xyz_api_url: Url,
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
        let land_position_repository = Arc::new(LandPositionRepository::new(database.clone()));
        let position_event_log_repository = Arc::new(PositionEventLogRepository::new(database.clone()));
        let pnl_processor_state_repository = Arc::new(PnlProcessorStateRepository::new(database.clone()));
        let gg_xyz_api = Arc::new(GGApi::new(&config.gg_xyz_api_url, config.gg_xyz_api_key));

        Ok(Arc::new(Self {
            event_listener_task: EventListenerTask::new(
                client.clone(),
                event_repository.clone(),
                Some(gg_xyz_api).filter(|_| config.gg_xyz_enabled),
            )
            .wrap(),
            model_listener_task: ModelListenerTask::new(
                client.clone(),
                land_repository.clone(),
                land_stake_repository.clone(),
            )
            .wrap(),
            pnl_processor_task: PnlProcessorTask::new(
                event_repository.clone(),
                land_repository.clone(),
                land_stake_repository.clone(),
                land_position_repository.clone(),
                position_event_log_repository.clone(),
                pnl_processor_state_repository.clone(),
            )
            .wrap(),
        }))
    }

    pub fn stop(self: &Arc<Self>) {
        self.event_listener_task.stop();
        self.model_listener_task.stop();
        self.pnl_processor_task.stop();
    }

    pub fn start(self: &Arc<Self>) {
        // Start all in parallel
        self.event_listener_task.start();
        self.model_listener_task.start();
        self.pnl_processor_task.start();
    }
}
