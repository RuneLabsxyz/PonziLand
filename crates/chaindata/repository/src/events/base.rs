use chaindata_models::events::EventDataModel;
use sqlx::Error;

use super::event_data::EventModelRepository;

pub struct EventDataRepository;

impl EventDataRepository {
    /// Saves an event to the database.
    ///
    /// # Errors
    ///
    /// Returns an error if the database operation fails.
    pub async fn save<'e, Conn>(conn: Conn, event: &EventDataModel) -> Result<(), Error>
    where
        Conn: 'e + sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        match event.clone() {
            EventDataModel::AddStake(event) => Self::save_event(conn, event),
            EventDataModel::AuctionFinished(event) => Self::save_event(conn, event),
            EventDataModel::LandBought(event) => Self::save_event(conn, event),
            EventDataModel::LandNuked(event) => Self::save_event(conn, event),
            EventDataModel::NewAuction(event) => Self::save_event(conn, event),
            EventDataModel::AddressAuthorized(event) => Self::save_event(conn, event),
            EventDataModel::AddressRemoved(event) => Self::save_event(conn, event),
            EventDataModel::VerifierUpdated(event) => Self::save_event(conn, event),
            EventDataModel::LandTransfer(event) => Self::save_event(conn, event),
        }
        .await
    }
}
