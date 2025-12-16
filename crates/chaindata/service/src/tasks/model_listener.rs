use std::{cmp::max, sync::Arc};

use chaindata_models::{
    events::EventId,
    models::{LandModel, LandStakeModel},
};
use chaindata_repository::{LandRepository, LandStakeRepository};
use chrono::{DateTime, Utc};
use ponziland_models::models::Model;
use sqlx::error::DatabaseError;
use tokio::select;
use tokio_stream::StreamExt;
use torii_ingester::{RawToriiData, ToriiClient};
use tracing::{debug, error, info, warn};

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
        let model_name = model_data.name().to_string();
        let parsed = Model::parse(model_data).unwrap_or_else(|err| {
            panic!("Failed to parse {model_name}: {err}");
        });

        let event_id = match parsed
            .event_id
            .as_ref()
            .map(|id| EventId::parse_from_torii(id))
        {
            Some(Ok(id)) => id,
            _ => {
                warn!(
                    "Skipping model with invalid or missing event_id: {:?}",
                    parsed.event_id
                );
                return;
            }
        };

        let timestamp = parsed.timestamp.unwrap_or(Utc::now()).naive_utc();

        let (result, model_name, location_for_log) = match parsed.model {
            Model::Land(land) => {
                let location_for_log = Some(format!("{:?}", land.location));
                let result = self
                    .land_repository
                    .save(LandModel::from_at(&land, event_id.clone(), timestamp))
                    .await;

                (result, "Land", location_for_log)
            }
            Model::LandStake(land_stake) => {
                let location_for_log = Some(format!("{:?}", land_stake.location));
                let result = self
                    .land_stake_repository
                    .save(LandStakeModel::from_at(
                        &land_stake,
                        event_id.clone(),
                        timestamp,
                    ))
                    .await;

                (result, "LandStake", location_for_log)
            }
            _ => {
                //TODO: Implement Auction model later
                return;
            }
        };

        match result {
            Ok(_) => {
                info!("Successfully saved event!");
            }
            Err(err) => {
                let location = location_for_log.as_deref();

                if Self::is_unique_violation(&err) {
                    debug!(
                        event_id = %event_id.as_string(),
                        model = model_name,
                        location = %location.unwrap_or("unknown"),
                        "Duplicate model, skipping"
                    );
                    return;
                }

                Self::log_save_error(model_name, &err, &event_id, location);
                return;
            }
        }
    }

    fn is_unique_violation(err: &chaindata_repository::Error) -> bool {
        matches!(err, chaindata_repository::Error::SqlError(sql_err)
            if sql_err
                .as_database_error()
                .is_some_and(DatabaseError::is_unique_violation))
    }

    fn log_save_error(
        model: &str,
        err: &chaindata_repository::Error,
        event_id: &EventId,
        location: Option<&str>,
    ) {
        let location = location.unwrap_or("unknown");
        match err {
            chaindata_repository::Error::SqlError(sql_err) => {
                error!(
                    event_id = %event_id.as_string(),
                    model = model,
                    location = %location,
                    error = %sql_err,
                    "Failed to save model (SQL)"
                );
            }
            _ => {
                error!(
                    event_id = %event_id.as_string(),
                    model = model,
                    location = %location,
                    error = %err,
                    "Failed to save model"
                );
            }
        }
        debug!("Successfully saved event!");
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

            let last_check = last_check - chrono::Duration::seconds(1);

            info!("Polling for models after: {:?}", last_check);

            // Get all entities that were updated after the last check
            let mut models_stream = self
                .client
                .get_land_and_stake_entities_after(last_check)
                .expect("Error while fetching entities");

            // Process models as they go
            let mut model_count = 0;
            while let Some(model) = models_stream.next().await {
                self.process_model(model).await;
                model_count += 1;
            }

            if model_count > 0 {
                debug!("Processed {} new models", model_count);
            } else {
                debug!("No new models found");
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
