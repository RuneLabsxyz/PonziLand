use std::{
    fmt::Debug,
    task::{Context, Poll},
};

use apalis::{
    layers::prometheus::{PrometheusLayer, PrometheusService},
    prelude::Request,
};
use apalis_core::task::namespace::Namespace;
use tower::{Layer, Service};

/// A layer that logs a job info before it starts
#[derive(Debug, Clone)]
pub struct MonitoringLayer {
    namespace: &'static str,
}

impl MonitoringLayer {
    pub fn new(namespace: &'static str) -> Self {
        Self { namespace }
    }
}

impl<S> Layer<S> for MonitoringLayer {
    //
    type Service = NamespaceService<PrometheusService<S>>;

    fn layer(&self, service: S) -> Self::Service {
        NamespaceService {
            namespace: self.namespace,
            service: PrometheusLayer::default().layer(service),
        }
    }
}

// Example layer service
// This service implements the Log behavior
#[derive(Debug, Clone)]
pub struct NamespaceService<S> {
    namespace: &'static str,
    service: S,
}

impl<S, Req, Ctx> Service<Request<Req, Ctx>> for NamespaceService<S>
where
    S: Service<Request<Req, Ctx>> + Clone,
    Req: Debug,
    Ctx: Debug,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, mut request: Request<Req, Ctx>) -> Self::Future {
        // Update the namespace to make sure metrics are correctly applied.
        request.parts.namespace = Some(Namespace(self.namespace.to_string()));

        self.service.call(request)
    }
}
