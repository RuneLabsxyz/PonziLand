use std::sync::Arc;
use std::str::FromStr;

use chaindata_models::{
    events::{EventDataModel, EventId, FetchedEvent},
    models::{EntryType, ExitType, LandPosition, PositionEventLog, PositionStatus},
    shared::{Location, U256},
};
use chaindata_repository::{
    EventRepository, LandPositionRepository, LandRepository, LandStakeRepository,
    PnlProcessorStateRepository, PositionEventLogRepository,
};
use serde_json::json;
use sqlx::types::BigDecimal;
use tokio::select;
use tracing::{debug, error, info};

use super::Task;

/// `PnlProcessorTask` processes saved events to create and update land positions.
/// It runs after EventListenerTask and ModelListenerTask have saved their data.
pub struct PnlProcessorTask {
    event_repository: Arc<EventRepository>,
    land_repository: Arc<LandRepository>,
    land_stake_repository: Arc<LandStakeRepository>,
    land_position_repository: Arc<LandPositionRepository>,
    position_event_log_repository: Arc<PositionEventLogRepository>,
    pnl_processor_state_repository: Arc<PnlProcessorStateRepository>,
}

impl PnlProcessorTask {
    pub fn new(
        event_repository: Arc<EventRepository>,
        land_repository: Arc<LandRepository>,
        land_stake_repository: Arc<LandStakeRepository>,
        land_position_repository: Arc<LandPositionRepository>,
        position_event_log_repository: Arc<PositionEventLogRepository>,
        pnl_processor_state_repository: Arc<PnlProcessorStateRepository>,
    ) -> Self {
        Self {
            event_repository,
            land_repository,
            land_stake_repository,
            land_position_repository,
            position_event_log_repository,
            pnl_processor_state_repository,
        }
    }

    async fn process_batch(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Get last processed timestamp
        let state = self.pnl_processor_state_repository.get_last_processed().await?;
        let last_processed = state.last_processed_timestamp;

        // Get events after last processed timestamp
        let events = self.event_repository.get_events_after(last_processed).await?;

        if events.is_empty() {
            debug!("No new events to process");
            return Ok(());
        }

        info!("Processing {} events for PnL", events.len());

        let mut latest_timestamp = last_processed;
        let mut latest_event_id = state.last_processed_event_id;

        // Process events in timestamp order
        for event in events {
            self.process_event(&event).await?;
            latest_timestamp = event.at;
            latest_event_id = Some(event.id.clone());
        }

        // Update processor state
        self.pnl_processor_state_repository
            .update_last_processed(&latest_timestamp, latest_event_id.as_ref())
            .await?;

        info!("Successfully processed PnL batch, updated state to {}", latest_timestamp);

        Ok(())
    }

    async fn process_event(&self, event: &FetchedEvent) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        match &event.data {
            EventDataModel::AuctionFinished(auction) => {
                self.handle_auction_finished(event, auction).await?;
            }
            EventDataModel::LandBought(bought) => {
                self.handle_land_bought(event, bought).await?;
            }
            EventDataModel::LandNuked(nuked) => {
                self.handle_land_nuked(event, nuked).await?;
            }
            EventDataModel::LandTransfer(transfer) => {
                self.handle_land_transfer(event, transfer).await?;
            }
            EventDataModel::AddStake(stake) => {
                self.handle_add_stake(event, stake).await?;
            }
            _ => {
                // Ignore other events
            }
        }

        Ok(())
    }

    async fn handle_auction_finished(
        &self,
        event: &FetchedEvent,
        auction: &chaindata_models::events::actions::AuctionFinishedEventModel,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Check if position already exists (idempotency)
        if self.check_event_already_processed(&event.id).await? {
            return Ok(());
        }

        // Get land model for token_used and initial stake
        let land = self.land_repository.get_by_location(auction.location.into()).await?;
        let land_stake = self.land_stake_repository.get_by_location(auction.location.into()).await?;

        let position = LandPosition {
            position_id: 0, // Will be set by DB
            land_location: auction.location.into(),
            owner_address: auction.buyer.clone(),
            token_used: land.token_used.clone(),
            entry_price: auction.price.into(),
            entry_token: land.token_used.clone(), // Auction uses land's token
            entry_type: EntryType::Auction,
            entry_timestamp: event.at,
            entry_event_id: event.id.clone(),
            initial_stake: land_stake.amount,
            total_stake_added: U256::from_str("0").unwrap(),
            taxes_earned_by_token: json!({}),
            taxes_paid_amount: U256::from_str("0").unwrap(),
            total_buy_fee: U256::from_str("0").unwrap(), // TODO: calculate fee
            total_claim_fees: U256::from_str("0").unwrap(),
            exit_price: None,
            stake_refunded: None,
            exit_timestamp: None,
            exit_type: None,
            exit_event_id: None,
            status: PositionStatus::Active,
            value_in_usdc: None,
        };

        let position_id = self.land_position_repository.create_position(&position).await?;

        // Log the creation
        let log = PositionEventLog {
            log_id: 0, // Will be set by DB
            position_id,
            event_type: "CREATED".to_string(),
            event_data: json!({
                "entry_type": "AUCTION",
                "buyer": auction.buyer,
                "price": auction.price,
                "location": auction.location
            }),
            timestamp: event.at,
            blockchain_event_id: event.id.clone(),
        };

        self.position_event_log_repository.append_log(&log).await?;

        Ok(())
    }

    async fn handle_land_bought(
        &self,
        event: &FetchedEvent,
        bought: &chaindata_models::events::actions::LandBoughtEventModel,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Check if position already exists (idempotency)
        if self.check_event_already_processed(&event.id).await? {
            return Ok(());
        }

        // Handle buyer: create new position
        if bought.buyer != bought.seller {
            let land = self.land_repository.get_by_location(bought.location.into()).await?;
            let land_stake = self.land_stake_repository.get_by_location(bought.location.into()).await?;

            let position = LandPosition {
                position_id: 0,
                land_location: bought.location.into(),
                owner_address: bought.buyer.clone(),
                token_used: land.token_used.clone(),
                entry_price: bought.price.into(),
                entry_token: bought.token_used.clone(),
                entry_type: EntryType::Buy,
                entry_timestamp: event.at,
                entry_event_id: event.id.clone(),
                initial_stake: land_stake.amount,
                total_stake_added: U256::from_str("0").unwrap(),
                taxes_earned_by_token: json!({}),
                taxes_paid_amount: U256::from_str("0").unwrap(),
                total_buy_fee: U256::from_str("0").unwrap(), // TODO: calculate fee
                total_claim_fees: U256::from_str("0").unwrap(),
                exit_price: None,
                stake_refunded: None,
                exit_timestamp: None,
                exit_type: None,
                exit_event_id: None,
                status: PositionStatus::Active,
                value_in_usdc: None,
            };

            let position_id = self.land_position_repository.create_position(&position).await?;

            let log = PositionEventLog {
                log_id: 0,
                position_id,
                event_type: "CREATED".to_string(),
                event_data: json!({
                    "entry_type": "BUY",
                    "buyer": bought.buyer,
                    "seller": bought.seller,
                    "price": bought.price,
                    "token_used": bought.token_used,
                    "location": bought.location
                }),
                timestamp: event.at,
                blockchain_event_id: event.id.clone(),
            };

            self.position_event_log_repository.append_log(&log).await?;
        }

        // Handle seller: close existing position
        if bought.seller != "0x0" {
            self.close_position_at_location(
                bought.location.into(),
                &bought.seller,
                bought.price.into(),
                U256::from_str("0").unwrap(), // TODO: get actual stake refunded
                event.at,
                ExitType::Sold,
                &event.id,
            ).await?;
        }

        Ok(())
    }

    async fn handle_land_nuked(
        &self,
        event: &FetchedEvent,
        nuked: &chaindata_models::events::actions::LandNukedEventModel,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Check if position already exists (idempotency)
        if self.check_event_already_processed(&event.id).await? {
            return Ok(());
        }

        // Close position with nuked
        self.close_position_at_location(
            nuked.location.into(),
            &nuked.owner,
            U256::from_str("0").unwrap(), // No exit price for nuked
            U256::from_str("0").unwrap(), // No stake refunded for nuked
            event.at,
            ExitType::Nuked,
            &event.id,
        ).await?;

        Ok(())
    }

    async fn handle_land_transfer(
        &self,
        event: &FetchedEvent,
        transfer: &chaindata_models::events::actions::LandTransferEventModel,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Check if position already exists (idempotency)
        if self.check_event_already_processed(&event.id).await? {
            return Ok(());
        }

        // LandTransfer event represents tax payments from from_location to to_location
        // We need to find the owner of from_location (tax payer)
        let from_land = self.land_repository.get_by_location(transfer.from_location.into()).await?;

        // Find active position for the tax payer (from_location owner)
        let position = self.land_position_repository
            .get_active_by_owner_and_location(&from_land.owner, transfer.from_location.into())
            .await?;

        if let Some(position) = position {
            // This is always a TAX_OUT for the payer (from_location)
            // TODO: Update taxes_paid_amount
            // This requires adding the amount to the existing value

            let log = PositionEventLog {
                log_id: 0,
                position_id: position.position_id,
                event_type: "TAX_OUT".to_string(),
                event_data: json!({
                    "from_location": transfer.from_location,
                    "to_location": transfer.to_location,
                    "amount": transfer.amount,
                    "token_address": transfer.token_address
                }),
                timestamp: event.at,
                blockchain_event_id: event.id.clone(),
            };

            self.position_event_log_repository.append_log(&log).await?;
        }

        Ok(())
    }

    async fn handle_add_stake(
        &self,
        event: &FetchedEvent,
        stake: &chaindata_models::events::actions::AddStakeEventModel,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Check if position already exists (idempotency)
        if self.check_event_already_processed(&event.id).await? {
            return Ok(());
        }

        // Find active position at this location
        let position = self.land_position_repository
            .get_active_by_owner_and_location(&stake.owner, stake.location.into())
            .await?;

        if let Some(position) = position {
            // Update total_stake_added using BigDecimal as intermediary for addition
            let current_stake_bd = BigDecimal::from(position.total_stake_added);
            let added_stake_bd = BigDecimal::from(stake.new_stake_amount.clone());
            let new_total_stake = U256::from(current_stake_bd + added_stake_bd);

            self.land_position_repository
                .update_aggregates(
                    position.position_id,
                    Some(&new_total_stake),
                    None,
                    None,
                    None,
                    None,
                    None,
                )
                .await?;

            let log = PositionEventLog {
                log_id: 0,
                position_id: position.position_id,
                event_type: "STAKE_ADDED".to_string(),
                event_data: json!({
                    "owner": stake.owner,
                    "new_stake_amount": stake.new_stake_amount,
                    "location": stake.location
                }),
                timestamp: event.at,
                blockchain_event_id: event.id.clone(),
            };

            self.position_event_log_repository.append_log(&log).await?;
        }

        Ok(())
    }

    async fn close_position_at_location(
        &self,
        location: Location,
        owner: &str,
        exit_price: U256,
        stake_refunded: U256,
        exit_timestamp: chrono::NaiveDateTime,
        exit_type: ExitType,
        exit_event_id: &EventId,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let position = self.land_position_repository
            .get_active_by_owner_and_location(owner, location)
            .await?;

        if let Some(position) = position {
            self.land_position_repository
                .close_position(
                    position.position_id,
                    &exit_price,
                    &stake_refunded,
                    &exit_timestamp,
                    &exit_type,
                    exit_event_id,
                )
                .await?;

            let log = PositionEventLog {
                log_id: 0,
                position_id: position.position_id,
                event_type: "CLOSED".to_string(),
                event_data: json!({
                    "exit_type": exit_type,
                    "exit_price": exit_price,
                    "stake_refunded": stake_refunded,
                    "location": location,
                    "owner": owner
                }),
                timestamp: exit_timestamp,
                blockchain_event_id: exit_event_id.clone(),
            };

            self.position_event_log_repository.append_log(&log).await?;
        }

        Ok(())
    }

    async fn check_event_already_processed(&self, event_id: &EventId) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        // Check if any log entry exists for this event_id using the repository method
        let is_processed = self.position_event_log_repository.is_event_processed(event_id).await?;
        Ok(is_processed)
    }
}

#[async_trait::async_trait]
impl Task for PnlProcessorTask {
    const NAME: &'static str = "PnlProcessorTask";

    async fn do_task(self: std::sync::Arc<Self>, mut rx: tokio::sync::oneshot::Receiver<()>) {
        info!("Starting PnlProcessorTask with 10-second polling interval");

        loop {
            // Process a batch of events
            if let Err(err) = self.process_batch().await {
                error!("Error processing PnL batch: {}", err);
            }

            // Wait for 10 seconds before the next batch (or until stop signal)
            select! {
                () = tokio::time::sleep(std::time::Duration::from_secs(10)) => {
                    debug!("PnL processing interval completed, checking for new events...");
                },
                stop_result = &mut rx => {
                    match stop_result {
                        Ok(()) => info!("Received stop signal, shutting down PnL processing"),
                        Err(e) => info!("Stop channel closed unexpectedly: {}", e),
                    }
                    return;
                }
            }
        }
    }
}