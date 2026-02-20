use std::sync::Arc;

use chaindata_models::{
    events::EventId,
    models::{AuctionModel, LandModel, LandStakeModel},
};
use chaindata_repository::{AuctionRepository, LandRepository, LandStakeRepository};
use chrono::{DateTime, Utc};
use ponziland_models::models::Model;
use sqlx::error::DatabaseError;
use tokio::select;
use tokio_stream::StreamExt;
use torii_ingester::{RawToriiData, ToriiClient};
use tracing::{debug, error, info};

use super::Task;

/// `ModelsListenerTask` is a task that subscribes to some models of the on-chain indexer (torii),
/// and pushes them to the local database.
///
/// Supported models:
/// - Land
/// - `LandStake`
/// - Auction
pub struct ModelListenerTask {
    client: Arc<ToriiClient>,
    land_repository: Arc<LandRepository>,
    land_stake_repository: Arc<LandStakeRepository>,
    auction_repository: Arc<AuctionRepository>,
}

impl ModelListenerTask {
    pub fn new(
        client: Arc<ToriiClient>,
        land_repository: Arc<LandRepository>,
        land_stake_repository: Arc<LandStakeRepository>,
        auction_repository: Arc<AuctionRepository>,
    ) -> Self {
        Self {
            client,
            land_repository,
            land_stake_repository,
            auction_repository,
        }
    }

    /// Gets the most recent update time per model table.
    ///
    /// Note: we keep independent cursors so a frequently-updated model (e.g. `LandStake`)
    /// does not prevent catchup for a less frequent one (e.g. `Land`).
    async fn get_last_update_times(
        &self,
    ) -> Result<(DateTime<Utc>, DateTime<Utc>, DateTime<Utc>), sqlx::Error> {
        // If we did not start indexing, start from the beginning
        let fallback_time = DateTime::UNIX_EPOCH.naive_utc();

        // Get latest from each table independently
        let land_latest = self
            .land_repository
            .get_latest_timestamp()
            .await?
            .unwrap_or(fallback_time)
            .and_utc();
        let land_stake_latest = self
            .land_stake_repository
            .get_latest_timestamp()
            .await?
            .unwrap_or(fallback_time)
            .and_utc();
        let auction_latest = self
            .auction_repository
            .get_latest_timestamp()
            .await?
            .unwrap_or(fallback_time)
            .and_utc();

        Ok((land_latest, land_stake_latest, auction_latest))
    }

    async fn process_model(&self, model_data: RawToriiData) {
        let model = Model::parse(model_data).expect("Error while parsing model data");
        let result = match model.model {
            Model::Land(land) => {
                self.land_repository
                    .save(LandModel::from_at(
                        &land,
                        EventId::parse_from_torii(&model.event_id.unwrap()).unwrap(),
                        model.timestamp.unwrap_or(Utc::now()).naive_utc(),
                    ))
                    .await
            }
            Model::LandStake(land_stake) => {
                self.land_stake_repository
                    .save(LandStakeModel::from_at(
                        &land_stake,
                        EventId::parse_from_torii(&model.event_id.unwrap()).unwrap(),
                        model.timestamp.unwrap_or(Utc::now()).naive_utc(),
                    ))
                    .await
            }
            Model::Auction(auction) => {
                self.auction_repository
                    .save(AuctionModel::from_at(
                        &auction,
                        EventId::parse_from_torii(&model.event_id.unwrap()).unwrap(),
                        model.timestamp.unwrap_or(Utc::now()).naive_utc(),
                    ))
                    .await
            }
        };

        if let Err(chaindata_repository::Error::SqlError(err)) = result {
            if !err
                .as_database_error()
                .is_some_and(DatabaseError::is_unique_violation)
            {
                error!("Failed to save event: {}", err);
            }

            // It is a duplicate, so ignore it
            return;
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
            let (last_land_check, last_land_stake_check, last_auction_check) = self
                .get_last_update_times()
                .await
                .expect("Failed to retrieve last update time");

            // Subtract 1 second to avoid missing models due to timestamp precision issues
            let safe_last_land_check = last_land_check - chrono::Duration::seconds(1);
            let safe_last_land_stake_check = last_land_stake_check - chrono::Duration::seconds(1);
            let safe_last_auction_check = last_auction_check - chrono::Duration::seconds(1);

            info!(
                "Polling for Land after: {:?}, LandStake after: {:?}, Auction after: {:?}",
                safe_last_land_check, safe_last_land_stake_check, safe_last_auction_check
            );

            let mut model_count = 0;

            // Land catchup
            let mut land_stream = self
                .client
                .get_land_entities_after(safe_last_land_check)
                .expect("Error while fetching Land entities");
            while let Some(model) = land_stream.next().await {
                self.process_model(model).await;
                model_count += 1;
            }

            // LandStake catchup
            let mut land_stake_stream = self
                .client
                .get_land_stake_entities_after(safe_last_land_stake_check)
                .expect("Error while fetching LandStake entities");
            while let Some(model) = land_stake_stream.next().await {
                self.process_model(model).await;
                model_count += 1;
            }

            // Auction catchup
            let mut auction_stream = self
                .client
                .get_auction_entities_after(safe_last_auction_check)
                .expect("Error while fetching Auction entities");
            while let Some(model) = auction_stream.next().await {
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
