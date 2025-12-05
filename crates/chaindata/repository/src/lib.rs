pub mod event;
pub mod events;
pub mod land;
pub mod land_historical;
pub mod land_stake;
pub mod price_feed;
pub mod wallet_activity;

mod error;

pub type Database = sqlx::PgPool;
pub use error::Error;
pub use event::Repository as EventRepository;
pub use land::Repository as LandRepository;
pub use land_historical::Repository as LandHistoricalRepository;
pub use land_stake::Repository as LandStakeRepository;
pub use price_feed::PriceFeedRepository;
pub use wallet_activity::WalletActivityRepository;
