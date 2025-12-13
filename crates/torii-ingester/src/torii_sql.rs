use std::time::Duration;

use reqwest::{Client, ClientBuilder, IntoUrl, Url};
use serde::de::DeserializeOwned;
use std::fmt::Debug;
use thiserror::Error;
use tracing::{debug, info, instrument};

#[derive(Error, Debug)]
pub enum Error {
    #[error("Invalid URL: {0:?}")]
    InvalidUrlError(Option<reqwest::Error>),
    #[error("Invalid client: {0:?}")]
    ClientCreationError(reqwest::Error),
    #[error("Error while requesting SQL: {0:?}")]
    RequestError(reqwest::Error),
    #[error("Invalid format for response: {0:?}")]
    ResponseError(reqwest::Error),
    #[error("Server returned invalid response: {0:?}")]
    BadResponse(Option<String>),
}

#[derive(Clone)]
pub struct SqlClient {
    sql_url: Url,
    client: Client,
}

impl SqlClient {
    fn make_sql_url<T: IntoUrl>(torii_url: T) -> Result<Url, Error> {
        let mut url = torii_url
            .into_url()
            .map_err(|e| Error::InvalidUrlError(Some(e)))?;
        #[allow(unused_mut)]
        if let Some(mut segment) = url.path_segments() {
            if segment.next_back() != Some("sql") {
                let mut segments = url
                    .path_segments_mut()
                    .map_err(|()| Error::InvalidUrlError(None))?;
                segments.push("sql");
            }

            Ok(url)
        } else {
            url.join("/sql").map_err(|_| Error::InvalidUrlError(None))
        }
    }

    /// Create a new `SqlClient` instance.
    ///
    /// # Errors
    /// Returns an error if the provided URL is invalid or if the client cannot be created.
    pub fn new<T: IntoUrl>(torii_url: T) -> Result<Self, Error> {
        let prepared_url = Self::make_sql_url(torii_url)?;

        info!("Torii SQL url: {}", prepared_url);

        let client = ClientBuilder::new()
            .timeout(Duration::from_secs(20))
            .build()
            .map_err(Error::ClientCreationError)?;

        Ok(Self {
            sql_url: prepared_url,
            client,
        })
    }

    #[instrument(skip(self))]
    pub async fn query<T, Q>(&self, query: Q) -> Result<Vec<T>, Error>
    where
        T: DeserializeOwned,
        Q: Into<String> + Debug,
    {
        let query = query.into();

        debug!("Making query: {}", query);

        // Make a request to the sql endpoint
        let response = self
            .client
            .post(self.sql_url.clone())
            .body(query)
            .send()
            .await
            .map_err(Error::RequestError)?;

        if response.status() == 200 {
            // Return the parsed response
            let body = response.text().await.map_err(Error::ResponseError)?;
            serde_json::from_str(&body).map_err(|_| Error::BadResponse(Some(body)))
        } else {
            Err(Error::BadResponse(response.text().await.ok()))
        }
    }
}
