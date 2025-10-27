use std::sync::Arc;

use chaindata_models::events::actions::{
    AuctionFinishedEventModel, LandBoughtEventModel, LandNukedEventModel, LandTransferEventModel,
};
use chaindata_models::{
    events::{EventDataModel, EventId, FetchedEvent},
    models::LandHistoricalModel,
    shared::U256,
};
use chaindata_repository::LandHistoricalRepository;
use chrono::{DateTime, Utc};
use ponziland_models::models::LandHistorical;
use tokio::select;
use torii_ingester::prelude::ContractAddress;
use tokio::sync::{broadcast, Mutex};
use tracing::{debug, error, info};

use super::Task;

/// `LandHistoricalListenerTask` tracks land ownership history
///
/// This task processes:
/// - `LandBoughtEvent` - Records land purchases and closes previous positions
/// - `AuctionFinishedEvent` - Records auction wins and closes previous positions
/// - `LandNukedEvent` - Closes positions when land is nuked
/// - `LandTransferEvent` - Tracks token flows (inflows/outflows) for open positions
pub struct LandHistoricalListenerTask {
    event_receiver: Arc<Mutex<broadcast::Receiver<FetchedEvent>>>,
    land_historical_repository: Arc<LandHistoricalRepository>,
}

impl LandHistoricalListenerTask {
    pub fn new(
        event_receiver: broadcast::Receiver<FetchedEvent>,
        land_historical_repository: Arc<LandHistoricalRepository>,
    ) -> Self {
        Self {
            event_receiver: Arc::new(Mutex::new(event_receiver)),
            land_historical_repository,
        }
    }

    /// TODO: Add USD conversion using price providers
    /// For now, this returns None but should integrate with AVNU/Ekubo price feeds
    fn convert_to_usd(_token_amount: &U256, _token_address: &str) -> Option<U256> {
        // Placeholder for USD conversion
        // This should integrate with the existing price providers:
        // - AVNU price provider for real-time USD rates
        // - Token registry for decimals/scaling
        None
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
            EventDataModel::LandTransfer(land_transfer) => {
                info!("Received LandTransfer event: {:?}", land_transfer);
                if let Err(e) = self.handle_land_transfer(land_transfer, at).await {
                    error!("Failed to handle land transfer event: {}", e);
                }
            }
            _ => {
                // We only care about land ownership events for land historical tracking
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

        // Close all previous positions for this land location with sale revenue
        let sale_revenue_token = Some(event.price.clone());
        let sale_token_used = Some(event.token_used.as_str());
        let sale_revenue_usd = sale_revenue_token
            .as_ref()
            .and_then(|revenue| Self::convert_to_usd(revenue, &event.token_used));

        let closed_count = self
            .land_historical_repository
            .close_positions_by_land_location_with_sale(
                (*location).into(),
                at.naive_utc(),
                "bought",
                sale_revenue_token,
                sale_revenue_usd,
                sale_token_used,
            )
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

        // Extract financial data from the event
        let buy_cost_token = Some(event.price.clone());
        let buy_token_used = Some(event.token_used.clone());
        let buy_cost_usd = buy_cost_token
            .as_ref()
            .and_then(|cost| Self::convert_to_usd(cost, &event.token_used));

        // Create land historical for the buyer with financial data
        let position = LandHistorical::new_with_cost(
            buyer.parse::<ContractAddress>()?,
            (*location).into(),
            at.naive_utc(),
            buy_cost_token.map(|v| torii_ingester::prelude::U256::from(**v)),
            buy_cost_usd.map(|v| torii_ingester::prelude::U256::from(**v)),
            buy_token_used,
        );

        let position_model = LandHistoricalModel::from_land_historical(&position, at.naive_utc());

        info!(
            "Recording land purchase: {} bought land at location {:?} at {}",
            buyer, location, at
        );

        if let Err(e) = self.land_historical_repository.save(position_model).await {
            error!("Failed to save land historical: {}", e);
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

        // Close all previous positions for this land location with sale revenue
        let sale_revenue_token = Some(event.price.clone());
        let sale_token_used = None; // TODO: Determine default auction token
        let sale_revenue_usd = sale_revenue_token
            .as_ref()
            .and_then(|revenue| Self::convert_to_usd(revenue, ""));

        let closed_count = self
            .land_historical_repository
            .close_positions_by_land_location_with_sale(
                (*location).into(),
                at.naive_utc(),
                "bought",
                sale_revenue_token,
                sale_revenue_usd,
                sale_token_used,
            )
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

        // Extract financial data from the auction event
        let buy_cost_token = Some(event.price.clone());
        // Note: Auctions might use a default token (ETH/STRK), this should be configured
        let buy_token_used = None; // TODO: Determine default auction token
        let buy_cost_usd = buy_cost_token
            .as_ref()
            .and_then(|cost| Self::convert_to_usd(cost, ""));

        // Create land historical for the auction winner with financial data
        let position = LandHistorical::new_with_cost(
            buyer.parse::<ContractAddress>()?,
            (*location).into(),
            at.naive_utc(),
            buy_cost_token.map(|v| torii_ingester::prelude::U256::from(**v)),
            buy_cost_usd.map(|v| torii_ingester::prelude::U256::from(**v)),
            buy_token_used,
        );

        let position_model = LandHistoricalModel::from_land_historical(&position, at.naive_utc());

        info!(
            "Recording auction win: {} won auction for land at location {:?} at {}",
            buyer, location, at
        );

        if let Err(e) = self.land_historical_repository.save(position_model).await {
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
            .land_historical_repository
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

    async fn handle_land_transfer(
        &self,
        event: LandTransferEventModel,
        at: DateTime<Utc>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let from_location = event.from_location;
        let to_location = event.to_location;
        let token_address = event.token_address.clone();
        let amount = event.amount;

        {
            // Find open position for the from_location (this is an outflow)
            let from_positions = self
                .land_historical_repository
                .get_open_positions_by_land_location((*from_location).into())
                .await?;

            for mut position in from_positions {
                info!(
                    "Updating outflow for position {} at location {:?}: {} {}",
                    position.id, from_location, amount, token_address
                );

                // Convert position to LandHistorical, update outflows, and save
                let mut land_hist = position.to_land_historical();
                let current_outflow = land_hist
                    .token_outflows
                    .entry(token_address.clone())
                    .or_insert_with(|| torii_ingester::prelude::U256::from(0u64));
                let amount_u256 = torii_ingester::prelude::U256::from(**amount);
                let new_value = **current_outflow + *amount_u256;
                *current_outflow = torii_ingester::prelude::U256::from(new_value);

                // Convert back and save
                position = LandHistoricalModel::from_land_historical(&land_hist, at.naive_utc());
                if let Err(e) = self.land_historical_repository.save(position).await {
                    error!(
                        "Failed to update outflow for position at location {:?}: {}",
                        from_location, e
                    );
                }
            }

            // Find open position for the to_location (this is an inflow)
            let to_positions = self
                .land_historical_repository
                .get_open_positions_by_land_location((*to_location).into())
                .await?;

            for mut position in to_positions {
                info!(
                    "Updating inflow for position {} at location {:?}: {} {}",
                    position.id, to_location, amount, token_address
                );

                // Convert position to LandHistorical, update inflows, and save
                let mut land_hist = position.to_land_historical();
                let current_inflow = land_hist
                    .token_inflows
                    .entry(token_address.clone())
                    .or_insert_with(|| torii_ingester::prelude::U256::from(0u64));
                let amount_u256 = torii_ingester::prelude::U256::from(**amount);
                let new_value = **current_inflow + *amount_u256;
                *current_inflow = torii_ingester::prelude::U256::from(new_value);

                // Convert back and save
                position = LandHistoricalModel::from_land_historical(&land_hist, at.naive_utc());
                if let Err(e) = self.land_historical_repository.save(position).await {
                    error!(
                        "Failed to update inflow for position at location {:?}: {}",
                        to_location, e
                    );
                }
            }
        }

        Ok(())
    }
}

#[async_trait::async_trait]
impl Task for LandHistoricalListenerTask {
    const NAME: &'static str = "LandHistoricalListenerTask";

    async fn do_task(self: std::sync::Arc<Self>, mut rx: tokio::sync::oneshot::Receiver<()>) {
        info!("Starting LandHistoricalListenerTask receiving events from EventListenerTask");

        let mut event_count = 0;

        loop {
            select! {
                // Process events from the channel
                event_result = async { self.event_receiver.lock().await.recv().await } => {
                    match event_result {
                        Ok(event) => {
                            event_count += 1;
                            debug!("Received event from EventListenerTask");
                            self.process_event(event.data, event.id, event.at.and_utc()).await;

                            if event_count % 10 == 0 {
                                info!("Processed {} land ownership events", event_count);
                            }
                        }
                        Err(broadcast::error::RecvError::Closed) => {
                            error!("Event channel closed, stopping land historical listener");
                            return;
                        }
                        Err(broadcast::error::RecvError::Lagged(n)) => {
                            error!("Land historical listener lagged by {} events", n);
                            // Continue processing
                        }
                    }
                },
                // Handle stop signal
                stop_result = &mut rx => {
                    match stop_result {
                        Ok(()) => info!("Received stop signal, shutting down land historical tracking"),
                        Err(e) => info!("Stop channel closed unexpectedly: {}", e),
                    }
                    return;
                }
            }
        }
    }
}
