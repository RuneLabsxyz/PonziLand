use std::future::ready;

use ::axum::{routing::get, serve, serve::Serve, Router};
use metrics_exporter_prometheus::{PrometheusBuilder, PrometheusHandle};
use tracing::info;

use crate::config::Conf;

pub mod apalis;
pub mod axum;

pub async fn listen_monitoring(config: &Conf) -> Serve<tokio::net::TcpListener, Router, Router> {
    let recorder = recorder();

    // run our app with hyper, listening globally on the chosen address and port
    let listener = tokio::net::TcpListener::bind(format!(
        "{}:{}",
        config.monitoring.address, config.monitoring.port
    ))
    .await
    .unwrap();

    info!(
        "Monitoring service listening on http://{}{}",
        listener.local_addr().unwrap(),
        config.monitoring.path
    );

    let app = Router::new()
        // `GET /` goes to `root`
        .route(
            &config.monitoring.path,
            get(move || ready(recorder.render())),
        );

    serve(listener, app)
}

pub fn recorder() -> PrometheusHandle {
    PrometheusBuilder::new()
        .install_recorder()
        .expect("Could not install Prometheus recorder")
}
