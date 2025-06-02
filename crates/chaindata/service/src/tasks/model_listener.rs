use std::{cmp::max, sync::Arc};

use chaindata_models::{
    events::EventId,
    models::{LandModel, LandStakeModel},
};
use chaindata_repository::{LandRepository, LandStakeRepository};
use chrono::{DateTime, Utc};
use ponziland_models::models::Model;
use tokio::select;
use tokio_stream::StreamExt;
use torii_ingester::{RawToriiData, ToriiClient};
use tracing::{debug, info};

use super::Task;

/// `ModelsListenerTask` is a task that subscribes to some models of the on-chain indexer (torii),
/// and pushes them to the local database.
///
/// Supported models:
/// - Land
/// - `LandStake`
/// - Auctions (soon, TODO)
pub struct ModelListenerTask {
    client: Arc<ToriiClient>,
    land_repository: Arc<LandRepository>,
    land_stake_repository: Arc<LandStakeRepository>,
}

impl ModelListenerTask {
    pub fn new(
        client: Arc<ToriiClient>,
        land_repository: Arc<LandRepository>,
        land_stake_repository: Arc<LandStakeRepository>,
    ) -> Self {
        Self {
            client,
            land_repository,
            land_stake_repository,
        }
    }

    /// Gets the most recent update time across all model tables.
    /// This is used to determine where to start when catching up with model updates.
    async fn get_last_update_time(&self) -> Result<DateTime<Utc>, sqlx::Error> {
        // If we did not start indexing, start from the beginning
        let fallback_time = DateTime::UNIX_EPOCH.naive_utc();

        // Get latest from land table
        let land_latest = self
            .land_repository
            .get_latest_timestamp()
            .await?
            .unwrap_or(fallback_time);
        let land_stake_latest = self
            .land_stake_repository
            .get_latest_timestamp()
            .await?
            .unwrap_or(fallback_time);

        Ok(max(land_latest, land_stake_latest).and_utc())
    }

    #[allow(clippy::match_wildcard_for_single_variants)]
    async fn process_model(&self, model_data: RawToriiData) {
        let model = Model::parse(model_data).expect("Error while parsing model data");
        match model.model {
            Model::Land(land) => {
                self.land_repository
                    .save(LandModel::from_at(
                        &land,
                        EventId::parse_from_torii(&model.event_id.unwrap()).unwrap(),
                        model.timestamp.unwrap_or(Utc::now()).naive_utc(),
                    ))
                    .await
                    .expect("Failed to save land model");
            }
            Model::LandStake(land_stake) => {
                self.land_stake_repository
                    .save(LandStakeModel::from_at(
                        &land_stake,
                        EventId::parse_from_torii(&model.event_id.unwrap()).unwrap(),
                        model.timestamp.unwrap_or(Utc::now()).naive_utc(),
                    ))
                    .await
                    .expect("Failed to save land stake model");
            }
            _ => {
                //TODO: Implement this later
            }
        }
    }
}

#[async_trait::async_trait]
impl Task for ModelListenerTask {
    const NAME: &'static str = "ModelsListenerTask";

    async fn do_task(self: std::sync::Arc<Self>, mut rx: tokio::sync::oneshot::Receiver<()>) {
        info!("Starting ModelListenerTask with 10-second polling interval");

        loop {
            // Poll for new models from the database
            let last_check = self
                .get_last_update_time()
                .await
                .expect("Failed to retrieve last update time");

            info!("Polling for models after: {:?}", last_check);

            // Get all entities that were updated after the last check
            let models_stream = self
                .client
                .get_all_entities_after(last_check)
                .expect("Error while fetching entities");

            // Collect all models from the stream
            let models: Vec<RawToriiData> = models_stream.collect().await;

            if models.is_empty() {
                debug!("No new models found");
            } else {
                info!("Found {} new models to process", models.len());

                // Process each model
                for model in models {
                    self.process_model(model).await;
                }
            }

            // Wait for 10 seconds before the next poll (or until stop signal)
            select! {
                () = tokio::time::sleep(std::time::Duration::from_secs(10)) => {
                    debug!("Polling interval completed, checking for new models...");
                },
                stop_result = &mut rx => {
                    match stop_result {
                        Ok(()) => info!("Received stop signal, shutting down model processing"),
                        Err(e) => info!("Stop channel closed unexpectedly: {}", e),
                    }
                    return;
                }
            }
        }
    }
}
