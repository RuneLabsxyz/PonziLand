use crate::{Database, Error};
use chaindata_models::models::LandPosition;
use chaindata_models::shared::Location;
use sqlx::{query, query_as};

pub struct Repository {
    db: Database,
}

impl Repository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Create a new position
    ///
    /// # Errors
    /// Returns an error if the position could not be created.
    pub async fn create_position(&self, position: &LandPosition) -> Result<i32, Error> {
        let position_id = query!(
            r#"
            INSERT INTO land_position (
                land_location, owner_address, token_used,
                entry_price, entry_token, entry_type, entry_timestamp, entry_event_id,
                initial_stake, total_stake_added,
                taxes_earned_by_token, taxes_paid_amount,
                total_buy_fee, total_claim_fees,
                status, value_in_usdc
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING position_id
            "#,
            position.land_location as Location,
            position.owner_address,
            position.token_used,
            position.entry_price as _,
            position.entry_token,
            position.entry_type as _,
            position.entry_timestamp,
            position.entry_event_id as _,
            position.initial_stake as _,
            position.total_stake_added as _,
            position.taxes_earned_by_token,
            position.taxes_paid_amount as _,
            position.total_buy_fee as _,
            position.total_claim_fees as _,
            position.status as _,
            position.value_in_usdc as _
        )
        .fetch_one(&mut *(self.db.acquire().await?))
        .await?
        .position_id;

        Ok(position_id)
    }

    /// Get active position by owner and location
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn get_active_by_owner_and_location(
        &self,
        owner: &str,
        location: Location,
    ) -> Result<Option<LandPosition>, Error> {
        let position = query_as!(
            LandPosition,
            r#"
            SELECT
                position_id,
                land_location as "land_location: _",
                owner_address,
                token_used,
                entry_price as "entry_price: _",
                entry_token,
                entry_type as "entry_type: _",
                entry_timestamp,
                entry_event_id as "entry_event_id: _",
                initial_stake as "initial_stake: _",
                total_stake_added as "total_stake_added: _",
                taxes_earned_by_token,
                taxes_paid_amount as "taxes_paid_amount: _",
                total_buy_fee as "total_buy_fee: _",
                total_claim_fees as "total_claim_fees: _",
                exit_price as "exit_price: _",
                stake_refunded as "stake_refunded: _",
                exit_timestamp,
                exit_type as "exit_type: _",
                exit_event_id as "exit_event_id: _",
                status as "status: _",
                value_in_usdc as "value_in_usdc: _"
            FROM land_position
            WHERE owner_address = $1 AND land_location = $2 AND status = 'ACTIVE'
            "#,
            owner,
            location as Location
        )
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await?;

        Ok(position)
    }

    /// Get all active positions by owner
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn get_active_by_owner(&self, owner: &str) -> Result<Vec<LandPosition>, Error> {
        let positions = query_as!(
            LandPosition,
            r#"
            SELECT
                position_id,
                land_location as "land_location: _",
                owner_address,
                token_used,
                entry_price as "entry_price: _",
                entry_token,
                entry_type as "entry_type: _",
                entry_timestamp,
                entry_event_id as "entry_event_id: _",
                initial_stake as "initial_stake: _",
                total_stake_added as "total_stake_added: _",
                taxes_earned_by_token,
                taxes_paid_amount as "taxes_paid_amount: _",
                total_buy_fee as "total_buy_fee: _",
                total_claim_fees as "total_claim_fees: _",
                exit_price as "exit_price: _",
                stake_refunded as "stake_refunded: _",
                exit_timestamp,
                exit_type as "exit_type: _",
                exit_event_id as "exit_event_id: _",
                status as "status: _",
                value_in_usdc as "value_in_usdc: _"
            FROM land_position
            WHERE owner_address = $1 AND status = 'ACTIVE'
            ORDER BY entry_timestamp DESC
            "#,
            owner
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await?;

        Ok(positions)
    }

    /// Get all closed positions by owner
    ///
    /// # Errors
    /// Returns an error if the query fails.
    pub async fn get_closed_by_owner(&self, owner: &str) -> Result<Vec<LandPosition>, Error> {
        let positions = query_as!(
            LandPosition,
            r#"
            SELECT
                position_id,
                land_location as "land_location: _",
                owner_address,
                token_used,
                entry_price as "entry_price: _",
                entry_token,
                entry_type as "entry_type: _",
                entry_timestamp,
                entry_event_id as "entry_event_id: _",
                initial_stake as "initial_stake: _",
                total_stake_added as "total_stake_added: _",
                taxes_earned_by_token,
                taxes_paid_amount as "taxes_paid_amount: _",
                total_buy_fee as "total_buy_fee: _",
                total_claim_fees as "total_claim_fees: _",
                exit_price as "exit_price: _",
                stake_refunded as "stake_refunded: _",
                exit_timestamp,
                exit_type as "exit_type: _",
                exit_event_id as "exit_event_id: _",
                status as "status: _",
                value_in_usdc as "value_in_usdc: _"
            FROM land_position
            WHERE owner_address = $1 AND status = 'CLOSED'
            ORDER BY exit_timestamp DESC
            "#,
            owner
        )
        .fetch_all(&mut *(self.db.acquire().await?))
        .await?;

        Ok(positions)
    }

    /// Update aggregates (stake, taxes, fees) for a position
    ///
    /// # Errors
    /// Returns an error if the update fails.
    pub async fn update_aggregates(
        &self,
        position_id: i32,
        total_stake_added: Option<&chaindata_models::shared::U256>,
        taxes_earned_by_token: Option<&serde_json::Value>,
        taxes_paid_amount: Option<&chaindata_models::shared::U256>,
        total_buy_fee: Option<&chaindata_models::shared::U256>,
        total_claim_fees: Option<&chaindata_models::shared::U256>,
        value_in_usdc: Option<&chaindata_models::shared::U256>,
    ) -> Result<(), Error> {
        let mut query_builder = sqlx::QueryBuilder::new("UPDATE land_position SET position_id = position_id");

        let mut has_updates = false;

        if let Some(stake) = total_stake_added {
            query_builder.push(", total_stake_added = ");
            query_builder.push_bind(stake);
            has_updates = true;
        }

        if let Some(taxes) = taxes_earned_by_token {
            query_builder.push(", taxes_earned_by_token = ");
            query_builder.push_bind(taxes);
            has_updates = true;
        }

        if let Some(taxes_paid) = taxes_paid_amount {
            query_builder.push(", taxes_paid_amount = ");
            query_builder.push_bind(taxes_paid);
            has_updates = true;
        }

        if let Some(fee) = total_buy_fee {
            query_builder.push(", total_buy_fee = ");
            query_builder.push_bind(fee);
            has_updates = true;
        }

        if let Some(fees) = total_claim_fees {
            query_builder.push(", total_claim_fees = ");
            query_builder.push_bind(fees);
            has_updates = true;
        }

        if let Some(value) = value_in_usdc {
            query_builder.push(", value_in_usdc = ");
            query_builder.push_bind(value);
            has_updates = true;
        }

        if !has_updates {
            return Ok(());
        }

        query_builder.push(" WHERE position_id = ");
        query_builder.push_bind(position_id);

        let query = query_builder.build();
        query.execute(&mut *(self.db.acquire().await?)).await?;

        Ok(())
    }

    /// Close a position
    ///
    /// # Errors
    /// Returns an error if the update fails.
    pub async fn close_position(
        &self,
        position_id: i32,
        exit_price: &chaindata_models::shared::U256,
        stake_refunded: &chaindata_models::shared::U256,
        exit_timestamp: &chrono::NaiveDateTime,
        exit_type: &chaindata_models::models::ExitType,
        exit_event_id: &chaindata_models::events::EventId,
    ) -> Result<(), Error> {
        query!(
            r#"
            UPDATE land_position
            SET exit_price = $1,
                stake_refunded = $2,
                exit_timestamp = $3,
                exit_type = $4,
                exit_event_id = $5,
                status = 'CLOSED'
            WHERE position_id = $6
            "#,
            exit_price as _,
            stake_refunded as _,
            exit_timestamp,
            exit_type as _,
            exit_event_id as _,
            position_id
        )
        .execute(&mut *(self.db.acquire().await?))
        .await?;

        Ok(())
    }
}