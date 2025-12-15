use crate::{Database, Error};
use chaindata_models::models::{DropLandModel, GlobalDropMetricsModel};
use chaindata_models::shared::{Location, U256};
use chrono::{NaiveDateTime, Utc};
use sqlx::types::BigDecimal;
use sqlx::{query, query_as, types::Json, Row};
use std::collections::HashMap;
use std::ops::Deref;
use std::str::FromStr;

/// Repository for querying drop land metrics and data
pub struct DropLandQueriesRepository {
    db: Database,
}
/// Internal struct for query_as! macro - represents a drop land from land_historical
#[derive(sqlx::FromRow)]
struct DropLandRow {
    land_location: Location,
    owner: String,
    time_bought: NaiveDateTime,
    close_date: Option<NaiveDateTime>,
    token_inflows: Json<HashMap<String, U256>>,
    token_outflows: Json<HashMap<String, U256>>,
}

impl DropLandQueriesRepository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get all drop lands owned by a reinjector address with optional time filters
    /// Unified query function that handles all time filter combinations
    async fn get_drop_lands_query(
        &self,
        reinjector_address: &str,
        since: Option<NaiveDateTime>,
        until: Option<NaiveDateTime>,
    ) -> Result<Vec<DropLandRow>, Error> {
        // Build WHERE clause dynamically based on provided filters
        let mut where_conditions = vec!["lh.owner = $1".to_string()];
        let mut param_index = 2;

        if since.is_some() {
            where_conditions.push(format!("lh.time_bought >= ${}", param_index));
            param_index += 1;
        }

        if until.is_some() {
            where_conditions.push(format!("lh.time_bought <= ${}", param_index));
        }

        let where_clause = where_conditions.join(" AND ");

        let query_str = format!(
            r#"
            SELECT
                lh.land_location,
                lh.owner,
                lh.time_bought,
                lh.close_date,
                lh.token_inflows,
                lh.token_outflows
            FROM land_historical lh
            WHERE {}
            ORDER BY lh.time_bought DESC
            "#,
            where_clause
        );

        let mut q = query(&query_str).bind(reinjector_address);

        if let Some(s) = since {
            q = q.bind(s);
        }

        if let Some(u) = until {
            q = q.bind(u);
        }

        let rows = q
            .fetch_all(&mut *(self.db.acquire().await?))
            .await
            .map_err(|e| Error::SqlError(e))?;

        // Map rows to DropLandRow
        let drop_lands: Vec<DropLandRow> = rows
            .into_iter()
            .map(|row| DropLandRow {
                land_location: row.get("land_location"),
                owner: row.get("owner"),
                time_bought: row.get("time_bought"),
                close_date: row.get("close_date"),
                token_inflows: row.get("token_inflows"),
                token_outflows: row.get("token_outflows"),
            })
            .collect();

        Ok(drop_lands)
    }

    fn normalize_address(address: &str) -> String {
        if let Some(hex_part) = address.strip_prefix("0x") {
            let trimmed = hex_part.trim_start_matches('0');
            let normalized = if trimmed.is_empty() {
                "0".to_string()
            } else {
                trimmed.to_lowercase()
            };
            format!("0x{}", normalized)
        } else {
            address.to_lowercase()
        }
    }

    /// Get all drop lands for a reinjector with raw data (internal helper)
    /// Returns tuple: (location, owner, time_bought, initial_stake, close_date, token_address)
    async fn get_drop_lands_raw(
        &self,
        reinjector_address: &str,
        since: Option<NaiveDateTime>,
        until: Option<NaiveDateTime>,
    ) -> Result<Vec<DropLandRow>, Error> {
        let normalized_address = Self::normalize_address(reinjector_address);
        self.get_drop_lands_query(&normalized_address, since, until)
            .await
    }

    /// Public wrapper for get_drop_lands with optional time filters
    /// Returns all drops owned by a reinjector with all metrics calculated
    /// Optionally filtered by time_bought range
    pub async fn get_drop_lands(
        &self,
        reinjector_address: &str,
        since: Option<NaiveDateTime>,
        until: Option<NaiveDateTime>,
        level: u8,
        fee_rate_basis_points: u128,
        sale_fee_basis_points: u128,
    ) -> Result<Vec<DropLandModel>, Error> {
        let drop_lands_raw = self
            .get_drop_lands_raw(reinjector_address, since, until)
            .await?;

        let mut results = Vec::new();
        for row in drop_lands_raw {
            // Determine the stake token from token_outflows (reflects the token actually staked)
            // If no claims happened yet (no outflows), fall back to the token used to buy the land
            let token_address = row
                .token_outflows
                .0
                .keys()
                .next()
                .cloned()
                .unwrap_or_else(|| "0x0".to_string());

            // Calculate total outflows from token_outflows (used as fallback)
            // token_outflows values are U256, sum them all
            let outflows_total: U256 =
                row.token_outflows
                    .0
                    .values()
                    .fold(Self::zero_u256(), |acc, val| {
                        let acc_bd = BigDecimal::from(acc);
                        let val_bd = BigDecimal::from(*val);
                        U256::from(acc_bd + val_bd)
                    });

            // Get initial stake from land_stake - first snapshot at or after time_bought
            // But ONLY if it's within the drop's time period
            let stake_from_db = self
                .get_stake_amount_in_period(row.land_location, row.time_bought, row.close_date)
                .await?;

            // Determine if we should use DB stake or fallback to outflows
            // Use outflows if: no stake found, or stake is suspiciously small compared to outflows
            let (drop_initial_stake, drop_remaining_stake, drop_distributed_total) =
                if let Some(initial) = stake_from_db {
                    // We have valid stake data from the DB
                    let remaining = if row.close_date.is_some() {
                        self.get_stake_amount_at(row.land_location, row.close_date)
                            .await?
                            .unwrap_or_else(Self::zero_u256)
                    } else {
                        self.get_stake_amount_at(row.land_location, None)
                            .await?
                            .unwrap_or_else(Self::zero_u256)
                    };

                    let distributed = {
                        let initial_bd = BigDecimal::from(initial);
                        let remaining_bd = BigDecimal::from(remaining);
                        if initial_bd > remaining_bd {
                            U256::from(initial_bd - remaining_bd)
                        } else {
                            Self::zero_u256()
                        }
                    };

                    (initial, remaining, distributed)
                } else {
                    // No valid stake data - use token_outflows as fallback
                    // For closed drops: initial = distributed = outflows_total, remaining = 0
                    // For active drops: we can't determine, use outflows as distributed so far
                    if row.close_date.is_some() {
                        // Closed drop: all stake was distributed
                        (outflows_total, Self::zero_u256(), outflows_total)
                    } else {
                        // Active drop: we don't know initial, use outflows as minimum distributed
                        // This is an approximation
                        (outflows_total, Self::zero_u256(), outflows_total)
                    }
                };

            // Get area protocol fees per token
            let area_protocol_fees_total = self
                .get_area_protocol_fees_per_token(
                    row.land_location,
                    level,
                    fee_rate_basis_points,
                    row.time_bought,
                    row.close_date,
                )
                .await?;

            // Get sale protocol fees for neighbor sales
            let sale_protocol_fees_total = self
                .get_sale_protocol_fees_per_token(
                    row.land_location,
                    level,
                    sale_fee_basis_points,
                    row.time_bought,
                    row.close_date,
                )
                .await?;

            // Get influenced auctions
            let influenced_auctions_total = self
                .get_influenced_auctions(row.land_location, row.time_bought, row.close_date, level)
                .await?;

            // Calculate token_inflows_usd from token_inflows (will be converted to USD later)
            let token_inflows_usd: u64 = 0; // TODO: Convert token_inflows to USD value

            // Calculate area_protocol_fees_usd from area_protocol_fees_total (will be converted to USD later)
            let area_protocol_fees_usd: u64 = 0; // TODO: Convert area_protocol_fees_total to USD value
            let sale_protocol_fees_usd: u64 = 0; // TODO: Convert sale_protocol_fees_total to USD value

            // ROI calculation requires token price conversions which are not available server-side.
            // This should be calculated in the client where token prices are accessible.
            // Formula: ROI = (area_protocol_fees_usd + influenced_auctions_usd + token_inflows_usd) / drop_distributed_usd
            let drop_roi = 0.0;

            let is_active = row.close_date.is_none();

            results.push(DropLandModel {
                land_location: row.land_location,
                owner: row.owner,
                token_address,
                time_bought: row.time_bought,
                drop_initial_stake,
                drop_remaining_stake,
                drop_distributed_total,
                token_inflows: row.token_inflows,
                token_inflows_usd,
                area_protocol_fees_total,
                area_protocol_fees_usd,
                sale_protocol_fees_total,
                sale_protocol_fees_usd,
                influenced_auctions_total,
                drop_roi,
                close_date: row.close_date,
                is_active,
            });
        }

        Ok(results)
    }

    /// Get the buyer's initial stake ONLY if data exists within the drop's time period.
    /// Returns None if no stake data exists within [time_bought, close_date].
    /// This prevents using stake data from a completely different time period.
    pub async fn get_stake_amount_in_period(
        &self,
        location: Location,
        time_bought: NaiveDateTime,
        close_date: Option<NaiveDateTime>,
    ) -> Result<Option<U256>, Error> {
        // First check if ANY stake data exists within the drop's period
        let period_end = close_date.unwrap_or_else(|| Utc::now().naive_utc());

        let exists_in_period = query(
            r#"
            SELECT 1
            FROM land_stake
            WHERE location = $1 AND at >= $2 AND at <= $3
            LIMIT 1
            "#,
        )
        .bind(location)
        .bind(time_bought)
        .bind(period_end)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
        .map_err(|e| Error::SqlError(e))?;

        // If no data exists in the period, return None (will trigger fallback)
        if exists_in_period.is_none() {
            return Ok(None);
        }

        // Data exists in the period, use the existing logic to find initial stake
        self.get_stake_amount_after(location, time_bought).await
    }

    /// Get the stake snapshot for a land location at or before a specific time (or latest if None)
    /// Uses at <= as_of, ordered DESC - gets the most recent snapshot before or at the given time
    /// Use this for: remaining stake at close_date, or current stake (None)
    pub async fn get_stake_amount_at(
        &self,
        location: Location,
        as_of: Option<NaiveDateTime>,
    ) -> Result<Option<U256>, Error> {
        let query_str = if as_of.is_some() {
            r#"
            SELECT COALESCE(amount, '0') as amount
            FROM land_stake
            WHERE location = $1 AND at <= $2
            ORDER BY at DESC
            LIMIT 1
            "#
        } else {
            r#"
            SELECT COALESCE(amount, '0') as amount
            FROM land_stake
            WHERE location = $1
            ORDER BY at DESC
            LIMIT 1
            "#
        };

        let mut q = query(query_str).bind(location);
        if let Some(ts) = as_of {
            q = q.bind(ts);
        }

        let result = q
            .fetch_optional(&mut *(self.db.acquire().await?))
            .await
            .map_err(|e| Error::SqlError(e))?;

        Ok(result.map(|row| row.get::<U256, _>("amount")))
    }

    /// Get the buyer's initial stake for a land location at the time of purchase.
    ///
    /// When a land is bought, the sequence is:
    /// 1. Seller pays final taxes (stake decreases)
    /// 2. Seller's stake goes to 0 (ownership transfer)
    /// 3. Buyer stakes new amount
    ///
    /// Multiple stake snapshots can have the same timestamp. We use the event id
    /// to get the correct order since ids are sequential (e.g., e_00000020, e_00000022).
    ///
    /// Strategy: Find a zero stake within the same timestamp window. If found,
    /// get the first non-zero stake after that id. Otherwise, get the first stake
    /// at or after time_bought ordered by id.
    pub async fn get_stake_amount_after(
        &self,
        location: Location,
        after: NaiveDateTime,
    ) -> Result<Option<U256>, Error> {
        // Look for a zero stake ONLY within the same timestamp as time_bought
        // This indicates ownership transfer happened at purchase time
        let zero_stake_result = query(
            r#"
            SELECT id
            FROM land_stake
            WHERE location = $1 AND at = $2 AND amount = '0'
            ORDER BY id ASC
            LIMIT 1
            "#,
        )
        .bind(location)
        .bind(after)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
        .map_err(|e| Error::SqlError(e))?;

        // If there's a zero stake at the exact time_bought, get the first non-zero stake AFTER that id
        // This represents the new owner's initial stake
        if let Some(zero_row) = zero_stake_result {
            let zero_id: String = zero_row.get("id");
            let result = query(
                r#"
                SELECT COALESCE(amount, '0') as amount
                FROM land_stake
                WHERE location = $1 AND id > $2 AND amount != '0'
                ORDER BY id ASC
                LIMIT 1
                "#,
            )
            .bind(location)
            .bind(zero_id)
            .fetch_optional(&mut *(self.db.acquire().await?))
            .await
            .map_err(|e| Error::SqlError(e))?;

            return Ok(result.map(|row| row.get::<U256, _>("amount")));
        }

        // No zero stake at time_bought - this is a first purchase or auction win
        // Return the first stake at or after the given time, ordered by id
        let result = query(
            r#"
            SELECT COALESCE(amount, '0') as amount
            FROM land_stake
            WHERE location = $1 AND at >= $2
            ORDER BY id ASC
            LIMIT 1
            "#,
        )
        .bind(location)
        .bind(after)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
        .map_err(|e| Error::SqlError(e))?;

        Ok(result.map(|row| row.get::<U256, _>("amount")))
    }

    /// Get the 8 neighboring locations for a given location (Level 1 - 3x3 area)
    /// Includes boundary checking for edge and corner locations
    pub fn get_area_neighbors(&self, location: Location) -> Vec<Location> {
        let loc_u64 = location.deref().0;
        let x = (loc_u64 & 0xFF) as i16;
        let y = ((loc_u64 >> 8) & 0xFF) as i16;

        let mut neighbors = Vec::new();

        // 8-directional neighbors (excluding center)
        for dx in [-1, 0, 1].iter() {
            for dy in [-1, 0, 1].iter() {
                if *dx == 0 && *dy == 0 {
                    continue; // Skip center location
                }

                let nx = x + dx;
                let ny = y + dy;

                // Check bounds (0-255 for both x and y)
                if nx >= 0 && nx < 256 && ny >= 0 && ny < 256 {
                    let neighbor_u64 = (nx as u64) | ((ny as u64) << 8);
                    neighbors.push(Location::from(neighbor_u64));
                }
            }
        }

        neighbors
    }

    /// Get all neighbors for a specified level
    /// Level 1: Direct neighbors (8 neighbors + center = 9 total)
    /// Level 2: Direct + neighbors of neighbors (25 total without duplicates)
    /// Level 3: Level 2 + neighbors of level 2 neighbors (49 total without duplicates)
    pub fn get_area_neighbors_by_level(&self, location: Location, level: u8) -> Vec<Location> {
        if level == 1 {
            // Level 1: just the direct neighbors + center
            let mut result = vec![location];
            result.extend(self.get_area_neighbors(location));
            return result;
        }

        // Level 2 and 3: use iterative approach
        let mut all_locations = vec![location];
        let mut current_level_neighbors = self.get_area_neighbors(location);
        all_locations.extend(current_level_neighbors.clone());

        for _ in 1..level {
            let mut next_level = Vec::new();
            for neighbor in &current_level_neighbors {
                let neighbors_of_neighbor = self.get_area_neighbors(*neighbor);
                for n in neighbors_of_neighbor {
                    if !all_locations.contains(&n) && !next_level.contains(&n) {
                        next_level.push(n);
                    }
                }
            }
            if next_level.is_empty() {
                break;
            }
            all_locations.extend(next_level.clone());
            current_level_neighbors = next_level;
        }

        all_locations
    }

    /// Calculate protocol fee per token from token inflows
    /// Given: amount with fee already deducted
    /// Fee = amount × (fee_rate_basis_points / (10_000_000 - fee_rate_basis_points))
    fn calculate_fee_per_token(inflow_amount: U256, fee_rate_basis_points: u128) -> U256 {
        let denominator = 10_000_000u128.saturating_sub(fee_rate_basis_points);
        if denominator == 0 {
            return U256::from(BigDecimal::from(0));
        }
        // Convert to BigDecimal, do math, convert back
        let inflow_bd = BigDecimal::from(inflow_amount);
        let fee_rate_bd = BigDecimal::from(fee_rate_basis_points as i64);
        let denominator_bd = BigDecimal::from(denominator as i64);
        let fee_bd = inflow_bd * fee_rate_bd / denominator_bd;
        U256::from(fee_bd)
    }

    /// Calculate simple fee from gross amount (e.g., secondary sale)
    /// Fee = amount × (fee_rate_basis_points / 10_000_000)
    fn calculate_sale_fee(amount: U256, fee_rate_basis_points: u128) -> U256 {
        let numerator_bd = BigDecimal::from(fee_rate_basis_points as i64);
        let denominator_bd = BigDecimal::from(10_000_000i64);
        let amount_bd = BigDecimal::from(amount);
        let fee_bd = amount_bd * numerator_bd / denominator_bd;
        U256::from(fee_bd)
    }

    /// Get protocol fees from the area of a drop (per-token calculation)
    /// Queries event_land_transfer inflows for neighbor lands during the drop window
    /// Returns HashMap<token_address, fee_amount>
    pub async fn get_area_protocol_fees_per_token(
        &self,
        location: Location,
        level: u8,
        fee_rate_basis_points: u128,
        time_bought: NaiveDateTime,
        close_date: Option<NaiveDateTime>,
    ) -> Result<Json<HashMap<String, U256>>, Error> {
        let area_locations = self.get_area_neighbors_by_level(location, level);
        if area_locations.is_empty() {
            return Ok(Json(HashMap::new()));
        }

        let period_end = close_date.unwrap_or_else(|| Utc::now().naive_utc());

        #[derive(sqlx::FromRow)]
        struct TokenFeeRow {
            token_address: String,
            total_amount: BigDecimal,
        }

        let mut query_str = String::from(
            "SELECT elt.token_address as token_address, COALESCE(SUM(CAST(elt.amount AS NUMERIC)), 0) as total_amount\n             FROM event_land_transfer elt\n             JOIN event e ON elt.id = e.id\n             WHERE elt.to_location IN (",
        );

        for i in 0..area_locations.len() {
            if i > 0 {
                query_str.push(',');
            }
            query_str.push_str(&format!("${}", i + 1));
        }

        query_str.push_str(") AND e.at >= $");
        query_str.push_str(&format!("{}", area_locations.len() + 1));
        query_str.push_str(" AND e.at <= $");
        query_str.push_str(&format!("{}", area_locations.len() + 2));
        query_str.push_str(" GROUP BY elt.token_address");

        let mut q = query_as::<_, TokenFeeRow>(&query_str);
        for loc in &area_locations {
            q = q.bind(*loc);
        }
        q = q.bind(time_bought);
        q = q.bind(period_end);

        let rows = q
            .fetch_all(&mut *(self.db.acquire().await?))
            .await
            .map_err(|e| Error::SqlError(e))?;

        let mut merged_fees: HashMap<String, U256> = HashMap::new();
        for row in rows {
            let inflow_amount = U256::from(row.total_amount.clone());
            let fee = Self::calculate_fee_per_token(inflow_amount, fee_rate_basis_points);
            merged_fees.insert(row.token_address, fee);
        }

        Ok(Json(merged_fees))
    }

    /// Get protocol fees from secondary sales (LandBought events) in the neighbor area
    /// Applies sale_fee_basis_points to each sale price and aggregates per token
    pub async fn get_sale_protocol_fees_per_token(
        &self,
        location: Location,
        level: u8,
        sale_fee_basis_points: u128,
        time_bought: NaiveDateTime,
        close_date: Option<NaiveDateTime>,
    ) -> Result<Json<HashMap<String, U256>>, Error> {
        let area_locations = self.get_area_neighbors_by_level(location, level);
        if area_locations.is_empty() {
            return Ok(Json(HashMap::new()));
        }

        let period_end = close_date.unwrap_or_else(|| Utc::now().naive_utc());

        #[derive(sqlx::FromRow)]
        struct SaleRow {
            token_used: String,
            total_price: BigDecimal,
        }

        let mut query_str = String::from(
            "SELECT elb.token_used as token_used, COALESCE(SUM(CAST(elb.price AS NUMERIC)), 0) as total_price\n             FROM event_land_bought elb\n             JOIN event e ON elb.id = e.id\n             WHERE elb.location IN (",
        );

        for i in 0..area_locations.len() {
            if i > 0 {
                query_str.push(',');
            }
            query_str.push_str(&format!("${}", i + 1));
        }

        query_str.push_str(") AND e.at >= $");
        query_str.push_str(&format!("{}", area_locations.len() + 1));
        query_str.push_str(" AND e.at <= $");
        query_str.push_str(&format!("{}", area_locations.len() + 2));
        query_str.push_str(" GROUP BY elb.token_used");

        let mut q = query_as::<_, SaleRow>(&query_str);
        for loc in &area_locations {
            q = q.bind(*loc);
        }
        q = q.bind(time_bought);
        q = q.bind(period_end);

        let rows = q
            .fetch_all(&mut *(self.db.acquire().await?))
            .await
            .map_err(|e| Error::SqlError(e))?;

        let mut merged_fees: HashMap<String, U256> = HashMap::new();
        for row in rows {
            let price_amount = U256::from(row.total_price.clone());
            let fee = Self::calculate_sale_fee(price_amount, sale_fee_basis_points);
            merged_fees.insert(row.token_used, fee);
        }

        Ok(Json(merged_fees))
    }

    /// Get auctions sold in neighbor locations during a drop's lifetime
    /// Filters event_auction_finished for neighbor locations within [time_bought, close_date or now]
    /// Returns the sum of price values
    pub async fn get_influenced_auctions(
        &self,
        location: Location,
        time_bought: NaiveDateTime,
        close_date: Option<NaiveDateTime>,
        level: u8,
    ) -> Result<U256, Error> {
        let area_locations = self.get_area_neighbors_by_level(location, level);
        if area_locations.is_empty() {
            return Ok(Self::zero_u256());
        }

        let period_end = close_date.unwrap_or_else(|| Utc::now().naive_utc());
        // Build dynamic query for location IN clause - need to join with event table for timestamp
        let mut query_str = String::from(
            r#"SELECT COALESCE(SUM(CAST(eaf.price AS NUMERIC)), 0) as total
               FROM event_auction_finished eaf
               JOIN event e ON eaf.id = e.id
               WHERE eaf.location IN ("#,
        );

        for i in 0..area_locations.len() {
            if i > 0 {
                query_str.push(',');
            }
            query_str.push_str(&format!("${}", i + 1));
        }
        query_str.push_str(") AND e.at >= $");
        query_str.push_str(&format!("{}", area_locations.len() + 1));
        query_str.push_str(" AND e.at <= $");
        query_str.push_str(&format!("{}", area_locations.len() + 2));

        let mut q = query(&query_str);
        for loc in &area_locations {
            q = q.bind(*loc); // Bind location as Location type
        }
        q = q.bind(time_bought);
        q = q.bind(period_end);

        let result = q
            .fetch_one(&mut *(self.db.acquire().await?))
            .await
            .map_err(|e| {
                Error::SqlError(e)
            })?;

        let total_amount: U256 = result.get("total");

        Ok(total_amount)
    }

    /// Helper function to create a zero U256 value
    fn zero_u256() -> U256 {
        U256::from_str("0").unwrap_or_else(|_| U256::from(BigDecimal::from(0)))
    }

    /// Get all metrics for a specific drop land
    /// Returns: (initial_stake, remaining_stake, area_fees_per_token, influenced_auctions)
    pub async fn get_drop_metrics(
        &self,
        location: Location,
        time_bought: NaiveDateTime,
        close_date: Option<NaiveDateTime>,
        level: u8,
        fee_rate_basis_points: u128,
    ) -> Result<(U256, U256, Json<HashMap<String, U256>>, U256), Error> {
        // Get initial stake from land_stake - first snapshot at or after time_bought
        let drop_initial_stake = self
            .get_stake_amount_after(location, time_bought)
            .await?
            .unwrap_or_else(Self::zero_u256);

        // Get remaining stake
        // If land is still active (no close_date), get the current/latest stake amount
        // If land is closed, get the stake amount at close_date
        let drop_remaining_stake = if close_date.is_some() {
            self.get_stake_amount_at(location, close_date)
                .await?
                .unwrap_or_else(Self::zero_u256)
        } else {
            // Active land: get the latest stake amount (no time constraint)
            self.get_stake_amount_at(location, None)
                .await?
                .unwrap_or_else(Self::zero_u256)
        };

        // Get area protocol fees per token
        let area_fees_per_token = self
            .get_area_protocol_fees_per_token(
                location,
                level,
                fee_rate_basis_points,
                time_bought,
                close_date,
            )
            .await?;

        // Get influenced auctions
        let influenced_auctions = self
            .get_influenced_auctions(location, time_bought, close_date, level)
            .await?;

        Ok((
            drop_initial_stake,
            drop_remaining_stake,
            area_fees_per_token,
            influenced_auctions,
        ))
    }

    /// Get global metrics for all drops owned by a reinjector in a time period
    /// Returns: (total_area_fees_per_token, total_distributed, total_influenced_auction_value)
    pub async fn get_global_metrics(
        &self,
        reinjector_address: &str,
        level: u8,
        fee_rate_basis_points: u128,
        sale_fee_basis_points: u128,
        since: Option<NaiveDateTime>,
        until: Option<NaiveDateTime>,
    ) -> Result<GlobalDropMetricsModel, Error> {
        // Get all drop lands in the time period with all metrics already calculated
        let drop_lands = self
            .get_drop_lands(
                reinjector_address,
                since,
                until,
                level,
                fee_rate_basis_points,
                sale_fee_basis_points,
            )
            .await?;

        let mut merged_area_fees: HashMap<String, U256> = HashMap::new();
        let mut distributed_per_token: HashMap<String, U256> = HashMap::new();
        let mut inflows_per_token: HashMap<String, U256> = HashMap::new();
        let mut sale_fees_per_token: HashMap<String, U256> = HashMap::new();
        let mut total_distributed = Self::zero_u256();
        let mut total_influenced_auctions = Self::zero_u256();

        for drop in drop_lands {
            // Add to total distributed using BigDecimal
            let total_distributed_bd = BigDecimal::from(total_distributed);
            let distributed_bd = BigDecimal::from(drop.drop_distributed_total);
            total_distributed = U256::from(total_distributed_bd + distributed_bd);

            // Group distributed by stake token for downstream per-token ROI calculations
            distributed_per_token
                .entry(drop.token_address.clone())
                .and_modify(|e| {
                    let e_bd = BigDecimal::from(*e);
                    let dist_bd = BigDecimal::from(drop.drop_distributed_total);
                    *e = U256::from(e_bd + dist_bd);
                })
                .or_insert(drop.drop_distributed_total);

            // Merge area fees into global map
            for (token_address, fee_amount) in drop.area_protocol_fees_total.0.iter() {
                merged_area_fees
                    .entry(token_address.clone())
                    .and_modify(|e| {
                        let e_bd = BigDecimal::from(*e);
                        let fee_bd = BigDecimal::from(*fee_amount);
                        *e = U256::from(e_bd + fee_bd);
                    })
                    .or_insert(*fee_amount);
            }

            // Merge inflows into global map
            for (token_address, inflow_amount) in drop.token_inflows.0.iter() {
                inflows_per_token
                    .entry(token_address.clone())
                    .and_modify(|e| {
                        let e_bd = BigDecimal::from(*e);
                        let inflow_bd = BigDecimal::from(*inflow_amount);
                        *e = U256::from(e_bd + inflow_bd);
                    })
                    .or_insert(*inflow_amount);
            }

            // Merge sale fees into global map
            for (token_address, fee_amount) in drop.sale_protocol_fees_total.0.iter() {
                sale_fees_per_token
                    .entry(token_address.clone())
                    .and_modify(|e| {
                        let e_bd = BigDecimal::from(*e);
                        let fee_bd = BigDecimal::from(*fee_amount);
                        *e = U256::from(e_bd + fee_bd);
                    })
                    .or_insert(*fee_amount);
            }

            // Add to total influenced auctions using BigDecimal
            let total_influenced_bd = BigDecimal::from(total_influenced_auctions);
            let influenced_bd = BigDecimal::from(drop.influenced_auctions_total);
            total_influenced_auctions = U256::from(total_influenced_bd + influenced_bd);
        }

        Ok(GlobalDropMetricsModel {
            area_fees_per_token: Json(merged_area_fees),
            distributed_per_token: Json(distributed_per_token),
            inflows_per_token: Json(inflows_per_token),
            sale_fees_per_token: Json(sale_fees_per_token),
            total_distributed,
            total_influenced_auctions,
        })
    }
}
