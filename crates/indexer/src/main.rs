use std::env;

use axum::{routing::get, Json, Router};
use config::Conf;
use confique::Config;
use serde::{Deserialize, Serialize};
use tokio::{
    select,
    signal::unix::{signal, SignalKind},
};
use tracing::{error, info};

pub mod config;
pub mod service;

#[tokio::main]
async fn main() {
    // initialize tracing
    tracing_subscriber::fmt::init();

    let config_path = env::var("CONFIG_PATH");

    let mut config = Conf::builder();

    if let Ok(path) = config_path {
        config = config.file(path);
    }

    let config = match config.env().load() {
        Ok(config) => config,
        Err(error) => {
            error!("Failed to load configuration: {}", error);
            std::process::exit(1);
        }
    };
    // build our application with a route
    let app = Router::new()
        // `GET /` goes to `root`
        .route("/", get(root));

    // run our app with hyper, listening globally on the chosen address and port
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", config.address, config.port))
        .await
        .unwrap();

    info!("Listening on http://{}", listener.local_addr().unwrap());

    let (stop_tx, stop_rx) = tokio::sync::oneshot::channel();

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

    select! {
        _ = axum::serve(listener, app) => {
        },
        _ = stop_rx => {
        }
    };
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
