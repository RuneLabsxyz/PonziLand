#![allow(clippy::missing_errors_doc)]

use std::{env, sync::Arc};

use anyhow::{Context, Result};
use axum::{
    http::{HeaderValue, Method},
    middleware,
    routing::get,
    Json, Router,
};
use chaindata_repository::{LandHistoricalRepository, LandRepository, WalletActivityRepository,DropLandQueriesRepository};
use chaindata_service::{ChainDataService, ChainDataServiceConfiguration};
use config::Conf;
use confique::Config;
use migrations::MIGRATOR;
use monitoring::listen_monitoring;
use routes::{
    drops::DropsRoute, land_historical::LandHistoricalRoute, lands::LandsRoute, price::PriceRoute,
    tokens::TokenRoute, wallets::WalletsRoute,
};
use serde::{Deserialize, Serialize};
use service::{avnu::AvnuService, ekubo::EkuboService, token::TokenService};
use sqlx::{postgres::PgConnectOptions, ConnectOptions, PgPool};
use state::AppState;
use tokio::{
    select,
    signal::unix::{signal, SignalKind},
};
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, level_filters::LevelFilter};
use tracing_subscriber::EnvFilter;
use worker::MonitorManager;

pub mod config;
pub mod service;
pub mod worker;

pub mod state;

pub mod routes;

pub mod monitoring;

#[tokio::main]
#[allow(clippy::too_many_lines)] //TODO: Split the state into multiple functions / files
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

    // Just useful for dev
    let _ = dotenv::dotenv();

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

    let avnu = AvnuService::new(&config, token_service.clone(), &monitor)
        .await
        .with_context(|| "Error while setting up avnu config")?;

    let options = PgConnectOptions::from_url(&config.database.url)
        .with_context(|| "Error while setting up database connection")?
        .application_name("ponzidexer");

    let pool = PgPool::connect_with(options)
        .await
        .with_context(|| "Impossible to connect to database")?;

    // Run migrations
    MIGRATOR
        .run(&pool)
        .await
        .with_context(|| "Error while migrating database")?;

    let chaindata_service = ChainDataService::new(
        pool.clone(),
        ChainDataServiceConfiguration {
            torii_url: config.torii.torii_url.clone().into(),
            world_address: config.torii.world_address,
        },
    )
    .await
    .with_context(|| "Impossible to setup the chain data service!")?;

    // Start it for the test
    chaindata_service.start();

    let land_repository = Arc::new(LandRepository::new(pool.clone()));
    let land_historical_repository = Arc::new(LandHistoricalRepository::new(pool.clone()));
    let wallet_activity_repository = Arc::new(WalletActivityRepository::new(pool.clone()));
    let drop_land_queries_repository = Arc::new(DropLandQueriesRepository::new(pool.clone()));

    let app_state = AppState::new(
        token_service.clone(),
        avnu.clone(),
        ekubo.clone(),
        land_repository,
        land_historical_repository,
        wallet_activity_repository,
        drop_land_queries_repository,
    );

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
        .nest(
            "/lands",
            LandsRoute::new().router().with_state(app_state.clone()),
        )
        .nest(
            "/land-historical",
            LandHistoricalRoute::new()
                .router()
                .with_state(app_state.clone()),
        )
        .nest(
            "/wallets",
            WalletsRoute::new().router().with_state(app_state.clone()),
        )
        .nest(
            "/drops",
            DropsRoute::new().router().with_state(app_state.clone()),
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
