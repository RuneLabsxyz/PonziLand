use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use chaindata_repository::DropLandQueriesRepository;
use chrono::NaiveDateTime;
use ponziland_models::models::DropLand;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct DropLandResponse {
    pub land_location: u32,
    pub owner: String,
    pub time_bought: String,
    pub drop_initial_stake: String,
    pub drop_remaining_stake: String,
    pub drop_distributed_total: String,
    pub neighbor_taxes_received: String,
    pub area_protocol_fees_total: String,
    pub drop_roi: f64,
    pub close_date: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GlobalDropMetricsResponse {
    pub total_revenue: String,
    pub total_drops_distributed: String,
    pub global_roi: f64,
    pub since: String,
    pub until: String,
}

#[derive(Debug, Deserialize)]
pub struct DropMetricsQuery {
    #[serde(default)]
    pub fee_rate_basis_points: Option<u128>,
}

#[derive(Debug, Deserialize)]
pub struct GlobalMetricsQuery {
    pub since: String, // ISO 8601 timestamp
    pub until: String, // ISO 8601 timestamp
    #[serde(default)]
    pub fee_rate_basis_points: Option<u128>,
}

pub struct DropsRoute;

impl Default for DropsRoute {
    fn default() -> Self {
        Self::new()
    }
}

impl DropsRoute {
    #[must_use]
    pub fn new() -> Self {
        Self
    }

    pub fn router(self) -> Router<AppState> {
        Router::new()
            .route("/:reinjector/list", get(Self::get_drop_lands))
            .route("/:location/metrics", get(Self::get_drop_metrics))
            .route("/:reinjector/global-metrics", get(Self::get_global_metrics))
    }

    /// Get all drop lands for a reinjector address
    /// GET /drops/{reinjector}/list
    async fn get_drop_lands(
        Path(reinjector): Path<String>,
        State(repo): State<Arc<DropLandQueriesRepository>>,
    ) -> Result<Json<Vec<(String, String, String, String, Option<String>)>>, axum::http::StatusCode>
    {
        let reinjector_lowercase = reinjector.to_lowercase();

        let drops = repo
            .get_drop_lands(&reinjector_lowercase, None, None)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        let response = drops
            .into_iter()
            .map(
                |(location, owner, time_bought, initial_stake, close_date)| {
                    (
                        location.to_string(),
                        owner,
                        time_bought.to_rfc3339(),
                        initial_stake.to_string(),
                        close_date.map(|d| d.to_rfc3339()),
                    )
                },
            )
            .collect();

        Ok(Json(response))
    }

    /// Get metrics for a specific drop land
    /// GET /drops/{location}/metrics?fee_rate_basis_points=900000
    async fn get_drop_metrics(
        Path(location): Path<u32>,
        Query(query): Query<DropMetricsQuery>,
        State(repo): State<Arc<DropLandQueriesRepository>>,
    ) -> Result<Json<DropLandResponse>, axum::http::StatusCode> {
        let location_i16 = location as u16;
        let location_obj = chaindata_models::shared::Location::from(location_i16);
        let fee_rate = query.fee_rate_basis_points.unwrap_or(900_000);

        let (initial, remaining, neighbor_taxes, area_fees) = repo
            .get_drop_metrics(location_obj, fee_rate)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        let distributed = if initial > remaining {
            initial - remaining
        } else {
            chaindata_models::shared::U256::from(0)
        };

        let drop_roi = if distributed > chaindata_models::shared::U256::from(0) {
            area_fees.to_f64() / distributed.to_f64()
        } else {
            0.0
        };

        let response = DropLandResponse {
            land_location: location,
            owner: "reinjector".to_string(),
            time_bought: chrono::Utc::now().to_rfc3339(),
            drop_initial_stake: initial.to_string(),
            drop_remaining_stake: remaining.to_string(),
            drop_distributed_total: distributed.to_string(),
            neighbor_taxes_received: neighbor_taxes.to_string(),
            area_protocol_fees_total: area_fees.to_string(),
            drop_roi,
            close_date: None,
            is_active: true,
        };

        Ok(Json(response))
    }

    /// Get global metrics for all drops in a time period
    /// GET /drops/{reinjector}/global-metrics?since=2024-01-01T00:00:00Z&until=2024-01-02T00:00:00Z&fee_rate_basis_points=900000
    async fn get_global_metrics(
        Path(reinjector): Path<String>,
        Query(query): Query<GlobalMetricsQuery>,
        State(repo): State<Arc<DropLandQueriesRepository>>,
    ) -> Result<Json<GlobalDropMetricsResponse>, axum::http::StatusCode> {
        let reinjector_lowercase = reinjector.to_lowercase();
        let fee_rate = query.fee_rate_basis_points.unwrap_or(900_000);

        // Parse timestamps
        let since = NaiveDateTime::parse_from_rfc3339(&query.since)
            .ok()
            .and_then(|dt| Some(dt.and_utc().naive_utc()))
            .ok_or(axum::http::StatusCode::BAD_REQUEST)?;

        let until = NaiveDateTime::parse_from_rfc3339(&query.until)
            .ok()
            .and_then(|dt| Some(dt.and_utc().naive_utc()))
            .ok_or(axum::http::StatusCode::BAD_REQUEST)?;

        let (total_revenue, total_distributed) = repo
            .get_global_metrics(&reinjector_lowercase, fee_rate, since, until)
            .await
            .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

        let global_roi = if total_distributed > chaindata_models::shared::U256::from(0) {
            total_revenue.to_f64() / total_distributed.to_f64()
        } else {
            0.0
        };

        let response = GlobalDropMetricsResponse {
            total_revenue: total_revenue.to_string(),
            total_drops_distributed: total_distributed.to_string(),
            global_roi,
            since: query.since,
            until: query.until,
        };

        Ok(Json(response))
    }
}
