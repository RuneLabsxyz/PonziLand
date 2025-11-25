use crate::{Database, Error};
use chaindata_models::shared::{Location, U256};
use chrono::NaiveDateTime;
use sqlx::{query, Row};
use std::ops::Deref;

/// Repository for querying drop land metrics and data
pub struct DropLandQueriesRepository {
    db: Database,
}

impl DropLandQueriesRepository {
    #[must_use]
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    /// Get all drop lands owned by a reinjector address
    ///
    /// # Arguments
    /// * `reinjector_address` - The address that owns the drop lands (hex format)
    /// * `since` - Optional start time to filter drops
    /// * `until` - Optional end time to filter drops
    pub async fn get_drop_lands(
        &self,
        reinjector_address: &str,
        since: Option<NaiveDateTime>,
        until: Option<NaiveDateTime>,
    ) -> Result<Vec<(Location, String, NaiveDateTime, String, Option<NaiveDateTime>)>, Error> {
        let mut query_str = String::from(
            r#"
            SELECT
                land_location,
                owner,
                time_bought,
                COALESCE(buy_cost_token, '0') as buy_cost_token,
                close_date
            FROM land_historical
            WHERE owner = $1
            "#,
        );

        if since.is_some() {
            query_str.push_str("AND time_bought >= $2 ");
        }
        if until.is_some() {
            query_str.push_str("AND time_bought <= $3 ");
        }

        query_str.push_str("ORDER BY time_bought DESC");

        let result = if let (Some(start), Some(end)) = (since, until) {
            query(query_str.as_str())
                .bind(reinjector_address)
                .bind(start)
                .bind(end)
                .fetch_all(&mut *(self.db.acquire().await?))
                .await
        } else if let Some(start) = since {
            query(query_str.as_str())
                .bind(reinjector_address)
                .bind(start)
                .fetch_all(&mut *(self.db.acquire().await?))
                .await
        } else if let Some(end) = until {
            query(query_str.as_str())
                .bind(reinjector_address)
                .bind(end)
                .fetch_all(&mut *(self.db.acquire().await?))
                .await
        } else {
            query(query_str.as_str())
                .bind(reinjector_address)
                .fetch_all(&mut *(self.db.acquire().await?))
                .await
        };

        result
            .map_err(|e| Error::SqlError(e))
            .map(|rows| {
                rows.iter()
                    .map(|row| {
                        let land_location: Location = row.get("land_location");
                        let owner: String = row.get("owner");
                        let time_bought: NaiveDateTime = row.get("time_bought");
                        let buy_cost_token: String = row.get("buy_cost_token");
                        let close_date: Option<NaiveDateTime> = row.get("close_date");

                        (
                            land_location,
                            owner,
                            time_bought,
                            buy_cost_token,
                            close_date,
                        )
                    })
                    .collect()
            })
    }

    /// Get the current remaining stake for a land location
    pub async fn get_current_remaining_stake(
        &self,
        location: Location,
    ) -> Result<Option<U256>, Error> {
        let result = query(
            r#"
            SELECT COALESCE(amount, '0') as amount
            FROM land_stake
            WHERE location = $1
            LIMIT 1
            "#,
        )
        .bind(location)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
        .map_err(|e| Error::SqlError(e))?;

        Ok(result.map(|row| row.get::<U256, _>("amount")))
    }

    /// Get the sum of token inflows for a land location
    /// Returns a HashMap serialized as JSON string
    pub async fn get_token_inflows_sum(&self, location: Location) -> Result<String, Error> {
        let result = query(
            r#"
            SELECT COALESCE(token_inflows, '{}') as token_inflows
            FROM land_historical
            WHERE land_location = $1
            ORDER BY time_bought DESC
            LIMIT 1
            "#,
        )
        .bind(location)
        .fetch_optional(&mut *(self.db.acquire().await?))
        .await
        .map_err(|e| Error::SqlError(e))?;

        Ok(result
            .map(|row| row.get::<String, _>("token_inflows"))
            .unwrap_or_default())
    }

    /// Get the 8 neighboring locations for a given location
    /// Returns the set of neighbor locations
    pub fn get_area_neighbors(&self, location: Location) -> Vec<Location> {
        let loc_u64 = location.deref().0;
        let x = (loc_u64 & 0xFF) as i16;
        let y = ((loc_u64 >> 8) & 0xFF) as i16;

        let mut neighbors = Vec::new();

        // 8-directional neighbors
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

    /// Get the sum of token inflows from all neighbors of a location
    /// This represents taxes received from neighboring lands
    /// Returns the total as a string
    pub async fn get_neighbor_taxes_received(&self, location: Location) -> Result<String, Error> {
        let inflows_json = self.get_token_inflows_sum(location).await?;

        // Parse JSON and sum all values
        if let Ok(map) = serde_json::from_str::<std::collections::HashMap<String, String>>(&inflows_json) {
            let total: u128 = map
                .values()
                .filter_map(|v| v.parse::<u128>().ok())
                .sum();
            Ok(total.to_string())
        } else {
            Ok("0".to_string())
        }
    }

    /// Calculate protocol fee from a transaction amount
    /// fee = amount * fee_rate_basis_points / 10_000_000
    fn calculate_protocol_fee(amount_str: &str, fee_rate_basis_points: u128) -> String {
        if let Ok(amount) = amount_str.parse::<u128>() {
            let fee = (amount * fee_rate_basis_points) / 10_000_000;
            fee.to_string()
        } else {
            "0".to_string()
        }
    }

    /// Get the total protocol fees earned from the 3x3 area around a drop land
    /// This includes fees from the drop land itself and its 8 neighbors
    pub async fn get_area_protocol_fees_total(
        &self,
        location: Location,
        fee_rate_basis_points: u128,
        since: Option<NaiveDateTime>,
        until: Option<NaiveDateTime>,
    ) -> Result<String, Error> {
        // Get the area: center + 8 neighbors
        let mut area_locations = vec![location];
        area_locations.extend(self.get_area_neighbors(location));

        // Query all LandTransferEvents FROM locations in the area
        let mut query_str = String::from(
            r#"
            SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total
            FROM event_land_transfer
            WHERE from_location IN (
            "#,
        );

        // Add location placeholders
        for i in 0..area_locations.len() {
            if i > 0 {
                query_str.push(',');
            }
            query_str.push('$');
            query_str.push_str(&(i + 1).to_string());
        }

        let mut param_index = area_locations.len() + 1;

        query_str.push_str(")");

        if since.is_some() {
            query_str.push_str(" AND ts >= $");
            query_str.push_str(&param_index.to_string());
            param_index += 1;
        }

        if until.is_some() {
            query_str.push_str(" AND ts <= $");
            query_str.push_str(&param_index.to_string());
        }

        let mut q = query(query_str.as_str());

        // Bind location parameters
        for loc in &area_locations {
            q = q.bind(*loc);
        }

        // Bind time parameters
        if let Some(start) = since {
            q = q.bind(start);
        }
        if let Some(end) = until {
            q = q.bind(end);
        }

        let result = q
            .fetch_one(&mut *(self.db.acquire().await?))
            .await
            .map_err(|e| Error::SqlError(e))?;

        let total_transfer_amount: String = result.get::<String, _>("total");

        // Apply fee rate to compute protocol fees
        let protocol_fees = Self::calculate_protocol_fee(&total_transfer_amount, fee_rate_basis_points);

        Ok(protocol_fees)
    }

    /// Get drop metrics for a specific drop land
    ///
    /// Returns:
    /// - drop_initial_stake
    /// - drop_remaining_stake
    /// - neighbor_taxes_received
    /// - area_protocol_fees_total
    pub async fn get_drop_metrics(
        &self,
        location: Location,
        fee_rate_basis_points: u128,
    ) -> Result<(String, String, String, String), Error> {
        let drop_initial_stake = {
            let result = query(
                r#"
                SELECT COALESCE(buy_cost_token, '0') as buy_cost_token
                FROM land_historical
                WHERE land_location = $1
                ORDER BY time_bought DESC
                LIMIT 1
                "#,
            )
            .bind(location)
            .fetch_optional(&mut *(self.db.acquire().await?))
            .await
            .map_err(|e| Error::SqlError(e))?
            .map(|row| row.get::<String, _>("buy_cost_token"));

            result.unwrap_or_else(|| "0".to_string())
        };

        let drop_remaining_stake = self
            .get_current_remaining_stake(location)
            .await?
            .map(|u256_val| u256_val.to_string())
            .unwrap_or_else(|| "0".to_string());

        let neighbor_taxes_received = self.get_neighbor_taxes_received(location).await?;

        let area_protocol_fees_total = self
            .get_area_protocol_fees_total(location, fee_rate_basis_points, None, None)
            .await?;

        Ok((
            drop_initial_stake,
            drop_remaining_stake,
            neighbor_taxes_received,
            area_protocol_fees_total,
        ))
    }

    /// Get global metrics for a time period
    ///
    /// Returns:
    /// - total_revenue_in_period (sum of protocol fees from all areas)
    /// - total_drops_distributed_in_period (sum of outflows from all reinjector positions)
    pub async fn get_global_metrics(
        &self,
        reinjector_address: &str,
        fee_rate_basis_points: u128,
        since: NaiveDateTime,
        until: NaiveDateTime,
    ) -> Result<(String, String), Error> {
        // Get all drop lands in the time period
        let drop_lands = self
            .get_drop_lands(reinjector_address, Some(since), Some(until))
            .await?;

        let mut total_revenue = 0u128;
        let mut total_distributed = 0u128;

        for (location, _, _, drop_initial_stake, _) in drop_lands {
            // Get area fees for this drop
            let area_fees = self
                .get_area_protocol_fees_total(location, fee_rate_basis_points, Some(since), Some(until))
                .await?;

            if let Ok(fees_u128) = area_fees.parse::<u128>() {
                total_revenue = total_revenue.saturating_add(fees_u128);
            }

            // Get distributed amount
            let remaining = self
                .get_current_remaining_stake(location)
                .await?
                .map(|u256_val| u256_val.to_string())
                .unwrap_or_else(|| "0".to_string());

            if let (Ok(initial), Ok(remaining_u128)) = (drop_initial_stake.parse::<u128>(), remaining.parse::<u128>()) {
                let distributed = if initial > remaining_u128 {
                    initial - remaining_u128
                } else {
                    0
                };
                total_distributed = total_distributed.saturating_add(distributed);
            }
        }

        Ok((total_revenue.to_string(), total_distributed.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_protocol_fee() {
        // Test fee calculation: 900_000 basis points (9%) on 1e18
        let amount = "1000000000000000000";
        let fee_rate = 900_000u128;
        let fee = DropLandQueriesRepository::calculate_protocol_fee(amount, fee_rate);

        // Should be 9% of 1e18 = 90_000_000_000_000_000
        assert_eq!(fee, "90000000000000000");
    }

    #[test]
    fn test_get_area_neighbors_center() {
        let repo = DropLandQueriesRepository::new(sqlx::PgPoolOptions::new().connect_lazy("").ok().unwrap());

        // Test center location (128, 128)
        let center = Location::from(((128 << 8) | 128) as u16);
        let neighbors = repo.get_area_neighbors(center);
        assert_eq!(neighbors.len(), 8);
    }

    #[test]
    fn test_get_area_neighbors_corner() {
        let repo = DropLandQueriesRepository::new(sqlx::PgPoolOptions::new().connect_lazy("").ok().unwrap());

        // Test corner location (0, 0) - should have only 3 neighbors
        let corner = Location::from(0u16);
        let neighbors = repo.get_area_neighbors(corner);
        assert_eq!(neighbors.len(), 3);
    }

    #[test]
    fn test_get_area_neighbors_edge() {
        let repo = DropLandQueriesRepository::new(sqlx::PgPoolOptions::new().connect_lazy("").ok().unwrap());

        // Test edge location (0, 128) - should have only 5 neighbors
        let edge = Location::from(((128 << 8) | 0) as u16);
        let neighbors = repo.get_area_neighbors(edge);
        assert_eq!(neighbors.len(), 5);
    }
}
