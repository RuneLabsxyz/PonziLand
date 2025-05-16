#![allow(clippy::missing_errors_doc)]

use std::{env, sync::Arc};

use anyhow::{Context, Result};
use axum::{
    http::{HeaderValue, Method},
    middleware,
    routing::get,
    Json, Router,
};
use chaindata_service::{ChainDataService, ChainDataServiceConfiguration};
use config::Conf;
use confique::Config;
use monitoring::listen_monitoring;
use routes::{price::PriceRoute, tokens::TokenRoute};
use serde::{Deserialize, Serialize};
use service::{ekubo::EkuboService, token::TokenService};
use sqlx::{postgres::PgConnectOptions, ConnectOptions, PgPool};
use state::AppState;
use tokio::{
    select,
    signal::unix::{signal, SignalKind},
};
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info, level_filters::LevelFilter};
use tracing_subscriber::EnvFilter;
use worker::MonitorManager;

pub mod config;
pub mod service;
pub mod worker;

pub mod state;

pub mod routes;

pub mod monitoring;

#[tokio::main]
async fn main() -> Result<()> {
    // initialize tracing
    let filter = EnvFilter::builder()
        .with_default_directive(LevelFilter::INFO.into())
        .from_env_lossy();

    tracing_subscriber::fmt::fmt()
        .with_env_filter(filter)
        .init();

    let config_path = env::var("CONFIG_PATH").unwrap_or("./config.toml".to_string());

    let mut config = Conf::builder();

    if let Ok(true) = std::fs::exists(&config_path) {
        config = config.file(config_path);
    }

    if let Err(e) = dotenv::dotenv() {
        error!("Impossible to load dotenv config: {}", e);
    }

    let config = config
        .env()
        .load()
        .with_context(|| "Impossible to read config")?;

    let monitor = MonitorManager::new();

    let token_service = Arc::new(
        TokenService::new(&config).with_context(|| "Error while setting up token service")?,
    );

    let ekubo = EkuboService::new(&config, token_service.clone(), &monitor)
        .await
        .with_context(|| "Error while setting up ekubo config")?;

    let options = PgConnectOptions::from_url(&config.database.url)
        .with_context(|| "Error while setting up database connection")?
        .application_name("ponzidexer");

    let pool = PgPool::connect_with(options)
        .await
        .with_context(|| "Impossible to connect to database")?;

    let chaindata_service = ChainDataService::new(
        pool.clone(),
        ChainDataServiceConfiguration {
            torii_url: config.torii.torii_url.clone().into(),
            world_address: config.torii.world_address,
            gg_xyz_enabled: config.gg_xyz.enabled,
            gg_xyz_api_url: config.gg_xyz.api_url.clone(),
            gg_xyz_api_key: config.gg_xyz.api_key.clone(),
        },
    )
    .await
    .with_context(|| "Impossible to setup the chain data service!")?;

    // Start it for the test
    chaindata_service.start();

    let app_state = AppState {
        token_service: token_service.clone(),
        ekubo_service: ekubo.clone(),
    };

    let cors = CorsLayer::new()
        // allow `GET` and `POST` when accessing the resource
        .allow_methods([Method::GET, Method::POST]);

    let cors = if config.cors_origins.len() == 1 && config.cors_origins[0] == "*" {
        cors.allow_origin(Any)
    } else {
        let origins = config
            .cors_origins
            .iter()
            .map(|e| HeaderValue::from_str(e))
            .collect::<Result<Vec<HeaderValue>, _>>()?;

        info!("Registered origins: {:#?}", origins);

        cors.allow_origin(origins)
    };

    // build our application with a route
    let app = Router::new()
        .nest("/tokens", TokenRoute::new(token_service).router())
        .nest(
            "/price",
            PriceRoute::new().router().with_state(app_state.clone()),
        )
        // `GET /` goes to `root`
        .route("/", get(root))
        .layer(cors)
        .layer(middleware::from_fn(crate::monitoring::axum::track_metrics));

    // run our app with hyper, listening globally on the chosen address and port
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", config.address, config.port))
        .await
        .unwrap();

    info!("Listening on http://{}", listener.local_addr().unwrap());

    let (stop_tx, mut stop_rx) = tokio::sync::oneshot::channel();

    // Handle Ctrl + C
    tokio::spawn(async move {
        let mut sigterm = signal(SignalKind::terminate()).unwrap();
        let mut sigint = signal(SignalKind::interrupt()).unwrap();
        select! {
            _ = sigterm.recv() => info!("Recieve SIGTERM"),
            _ = sigint.recv() => info!("Recieve SIGINT"),
        };

        stop_tx.send(()).unwrap();
    });

    let http = axum::serve(listener, app);
    let monitor = monitor.build().run();
    let monitoring = listen_monitoring(&config).await?;

    select! {
        _ = http => {},
        _ = monitor => {},
        _ = monitoring => {},
        _ = &mut stop_rx => {
            info!("Cancellation requested.");
            // Stop the chaindata service
            chaindata_service.stop();
        }
    }

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
struct RootValue {
    message: &'static str,
    version: &'static str,
    git_hash: &'static str,
}

async fn root() -> Json<RootValue> {
    Json(RootValue {
        message: "Welcome, traveler, to the amazing world of PonziLand!",
        version: env!("CARGO_PKG_VERSION"),
        git_hash: env!("GIT_HASH"),
    })
}
