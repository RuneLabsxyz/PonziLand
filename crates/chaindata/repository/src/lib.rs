pub mod event;
pub mod events;
pub mod land;
pub mod land_position;
pub mod land_stake;
pub mod pnl_processor_state;
pub mod position_event_log;

mod error;

pub type Database = sqlx::PgPool;
pub use error::Error;
pub use event::Repository as EventRepository;
pub use land::Repository as LandRepository;
pub use land_position::Repository as LandPositionRepository;
pub use land_stake::Repository as LandStakeRepository;
pub use pnl_processor_state::Repository as PnlProcessorStateRepository;
pub use position_event_log::Repository as PositionEventLogRepository;
