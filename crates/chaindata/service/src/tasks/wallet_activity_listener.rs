use std::sync::Arc;

use chaindata_models::events::actions::{
    AuctionFinishedEventModel, LandBoughtEventModel, LandNukedEventModel, LandTransferEventModel,
};
use chaindata_models::events::{EventDataModel, EventId, FetchedEvent};
use chaindata_repository::WalletActivityRepository;
use chrono::{DateTime, Utc};
use tokio::select;
use tokio::sync::{mpsc, Mutex};
use tracing::{debug, error, info};

use super::Task;

/// `WalletActivityListenerTask` tracks wallet activity across all events
///
/// This task processes all events and extracts wallet addresses:
/// - `LandBoughtEvent` - Records buyer and seller addresses
/// - `AuctionFinishedEvent` - Records buyer address
/// - `LandNukedEvent` - Records owner address
/// - `AddressAuthorizedEvent` - Records authorized address
/// - `AddressRemovedEvent` - Records removed address
/// - `LandTransferEvent` - Records from/to addresses from token transfers
pub struct WalletActivityListenerTask {
    event_receiver: Mutex<Option<mpsc::Receiver<FetchedEvent>>>,
    wallet_activity_repository: Arc<WalletActivityRepository>,
}

impl WalletActivityListenerTask {
    pub fn new(
        event_receiver: mpsc::Receiver<FetchedEvent>,
        wallet_activity_repository: Arc<WalletActivityRepository>,
    ) -> Self {
        Self {
            event_receiver: Mutex::new(Some(event_receiver)),
            wallet_activity_repository,
        }
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
                    error!("Failed to handle land bought wallet activity: {}", e);
                }
            }
            EventDataModel::AuctionFinished(auction_finished) => {
                if let Err(e) = self.handle_auction_finished(auction_finished, at).await {
                    error!("Failed to handle auction finished wallet activity: {}", e);
                }
            }
            EventDataModel::LandNuked(land_nuked) => {
                if let Err(e) = self.handle_land_nuked(land_nuked, at).await {
                    error!("Failed to handle land nuked wallet activity: {}", e);
                }
            }
            EventDataModel::LandTransfer(land_transfer) => {
                if let Err(e) = self.handle_land_transfer(land_transfer, at).await {
                    error!("Failed to handle land transfer wallet activity: {}", e);
                }
            }
            _ => {
                debug!("Event type not tracked for wallet activity");
            }
        }
    }

    async fn handle_land_bought(
        &self,
        event: LandBoughtEventModel,
        at: DateTime<Utc>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let event_type = "LandBought";

        // Record buyer activity (skip zero address)
        if event.buyer != "0x0" && event.buyer != "0" {
            self.wallet_activity_repository
                .upsert_wallet_activity(&event.buyer, event_type, at.naive_utc())
                .await?;
            debug!("Recorded wallet activity for buyer: {}", event.buyer);
        }

        // Record seller activity (skip zero address)
        if event.seller != "0x0" && event.seller != "0" {
            self.wallet_activity_repository
                .upsert_wallet_activity(&event.seller, event_type, at.naive_utc())
                .await?;
            debug!("Recorded wallet activity for seller: {}", event.seller);
        }

        Ok(())
    }

    async fn handle_auction_finished(
        &self,
        event: AuctionFinishedEventModel,
        at: DateTime<Utc>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let event_type = "AuctionFinished";

        // Record buyer activity (skip zero address)
        if event.buyer != "0x0" && event.buyer != "0" {
            self.wallet_activity_repository
                .upsert_wallet_activity(&event.buyer, event_type, at.naive_utc())
                .await?;
            debug!(
                "Recorded wallet activity for auction winner: {}",
                event.buyer
            );
        }

        Ok(())
    }

    async fn handle_land_nuked(
        &self,
        event: LandNukedEventModel,
        at: DateTime<Utc>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let event_type = "LandNuked";

        // Record owner activity (skip zero address)
        if event.owner != "0x0" && event.owner != "0" {
            self.wallet_activity_repository
                .upsert_wallet_activity(&event.owner, event_type, at.naive_utc())
                .await?;
            debug!(
                "Recorded wallet activity for land owner (nuked): {}",
                event.owner
            );
        }

        Ok(())
    }

    // Intentionally removed handlers for AddressAuthorized and AddressRemoved as they are not used currently

    async fn handle_land_transfer(
        &self,
        event: LandTransferEventModel,
        _at: DateTime<Utc>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Note: LandTransfer events contain from_location and to_location, not direct addresses
        // The addresses would be the owners of those locations
        // For now, we'll skip this event type as we'd need to look up current land owners
        // This could be enhanced in the future to include transfer activity

        debug!(
            "Land transfer event processed (locations: {:?} -> {:?})",
            event.from_location, event.to_location
        );

        Ok(())
    }
}

#[async_trait::async_trait]
impl Task for WalletActivityListenerTask {
    const NAME: &'static str = "WalletActivityListenerTask";

    async fn do_task(self: std::sync::Arc<Self>, mut rx: tokio::sync::oneshot::Receiver<()>) {
        info!("Starting WalletActivityListenerTask receiving events from EventListenerTask");

        // Take the channel for itself (no concurrent fights)
        let mut event_receiver = self
            .event_receiver
            .lock()
            .await
            .take()
            .expect("Multiple do_task has been called! This should not happen");

        let mut event_count = 0;

        loop {
            select! {
                // Process events from the channel
                event_result = async { event_receiver.recv().await } => {
                    if let Some(event) = event_result {
                        event_count += 1;
                        debug!("Received event from EventListenerTask for wallet tracking");
                        self.process_event(event.data, event.id, event.at.and_utc()).await;

                        if event_count % 50 == 0 {
                            info!("Processed {} events for wallet activity tracking", event_count);
                        }
                    } else {
                        error!("Event channel closed, stopping wallet activity listener");
                        return;
                    }
                },
                // Handle stop signal
                stop_result = &mut rx => {
                    match stop_result {
                        Ok(()) => info!("Received stop signal, shutting down wallet activity tracking"),
                        Err(e) => info!("Stop channel closed unexpectedly: {}", e),
                    }
                    return;
                }
            }
        }
    }
}
