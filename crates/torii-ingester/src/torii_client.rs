use crate::torii_sql::SqlClient;
use async_stream::stream;
use chrono::{DateTime, NaiveDateTime, Utc};
use dojo_types::schema::Struct;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use starknet::core::types::Felt;
use thiserror::Error;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::Stream;
use torii_client::Client as GrpcClient;

// TODO(Red): Make sure we loose no messages between the catchup and the listen
// (Maybe add the listen at the same time we do the catchup, and if we keep the event IDs somewhere, we can work with this system)

#[derive(Error, Debug)]
pub enum Error {
    #[error("Error while starting torii: {0}")]
    ToriiInitializationError(Box<torii_client::error::Error>),
    #[error("Error while setting up subscription: {0}")]
    GrpcSubscriptionError(Box<torii_client::error::Error>),
    #[error("SQL Query error: {0}")]
    SqlError(#[from] super::torii_sql::Error),
}

pub struct ToriiConfiguration {
    pub base_url: String,
    pub world_address: Felt,
}

pub struct ToriiClient {
    grpc_client: GrpcClient,
    sql_client: SqlClient,
}

/// Represents a raw event fetched from torii.
///
/// Due to the current system limitations, two types of messages can be returned by the `subscribe_and_catchup` function
#[derive(Clone, Debug)]
pub enum RawToriiData {
    Json {
        name: String,
        data: Value,
        at: DateTime<Utc>,
        event_id: String,
    },
    Grpc(Struct),
}

impl RawToriiData {
    #[must_use]
    pub fn name(&self) -> &str {
        match self {
            RawToriiData::Json { name, .. } => name,
            RawToriiData::Grpc(structure) => &structure.name,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
struct QueryResponse {
    selector: String,
    #[serde(deserialize_with = "deserialize_nested_json")]
    data: Value,
    event_id: String,
    created_at: String,
}

impl ToriiClient {
    /// Create a new instance of `ToriiClient`.
    ///
    /// # Errors
    /// Returns an error if the torii connection cannot be started.
    pub async fn new(config: &ToriiConfiguration) -> Result<Self, Error> {
        let grpc_client = GrpcClient::new(config.base_url.clone(), config.world_address)
            .await
            .map_err(Box::new)
            .map_err(Error::ToriiInitializationError)?;

        let sql_client = SqlClient::new(config.base_url.clone())?;

        Ok(Self {
            grpc_client,
            sql_client,
        })
    }

    /// Get all events after a given instant with microsecond precision.
    ///
    /// # Errors
    /// Returns an error if the SQL query fails.
    pub fn get_all_events_after(
        &self,
        instant: chrono::DateTime<Utc>,
    ) -> Result<impl Stream<Item = RawToriiData>, Error> {
        self.do_events_sql_request(format!("em.created_at > \"{}\"", instant.format("%F %T")))
    }

    /// Get all events.
    ///
    /// # Errors
    /// Returns an error if the SQL query fails.
    pub fn get_all_events(&self) -> Result<impl Stream<Item = RawToriiData>, Error> {
        self.do_events_sql_request("1=1")
    }

    /// Get all entities.
    ///
    /// # Errors
    /// Returns an error if the SQL query fails.
    pub fn get_all_entities(&self) -> Result<impl Stream<Item = RawToriiData>, Error> {
        self.do_entities_sql_request("1=1")
    }

    /// Get all entities after a given instant.
    ///
    /// # Errors
    /// Returns an error if the SQL query fails.
    pub fn get_all_entities_after(
        &self,
        instant: chrono::DateTime<Utc>,
    ) -> Result<impl Stream<Item = RawToriiData>, Error> {
        self.do_entities_sql_request(format!("e.created_at > \"{}\"", instant.format("%F %T")))
    }

    /// Get only Land and LandStake entities after a given instant.
    ///
    /// # Errors
    /// Returns an error if the SQL query fails.
    pub fn get_land_and_stake_entities_after(
        &self,
        instant: chrono::DateTime<Utc>,
    ) -> Result<impl Stream<Item = RawToriiData>, Error> {
        self.do_entities_sql_request(format!(
            "e.created_at > \"{}\" AND m.name IN ('Land','LandStake')",
            instant.format("%F %T")
        ))
    }

    /// Subscribe to events.
    ///
    /// # Errors
    /// Returns an error if the subscription fails.
    pub async fn subscribe_events(&self) -> Result<impl Stream<Item = RawToriiData>, Error> {
        let grpc_stream = self
            .grpc_client
            .on_event_message_updated(None)
            .await
            .map_err(Box::new)
            .map_err(Error::GrpcSubscriptionError)?;

        // Red: Ok, this might look a bit difficult, but let's take some time to go into
        // more detail into what this does:
        // - It takes a new event from the grpc stream when one it available (see the await)
        // - Validate that we get values with if let (convert back from a result)
        // - For each updated event in the model, "yield" (forward) the event to the stream
        let event_stream = stream! {
            for await value in grpc_stream {
                if let Ok((_subscription_id, entity)) = value {
                    for model in entity.models {
                        yield RawToriiData::Grpc(model)
                    }
                }
            }
        };

        Ok(event_stream)
    }

    /// Subscribe to events.
    ///
    /// # Errors
    /// Returns an error if the subscription fails.
    pub async fn subscribe_entities(&self) -> Result<impl Stream<Item = RawToriiData>, Error> {
        let grpc_stream = self
            .grpc_client
            .on_entity_updated(None) // Get everything
            .await
            .map_err(Box::new)
            .map_err(Error::GrpcSubscriptionError)?;

        // Red: Ok, this might look a bit difficult, but let's take some time to go into
        // more detail into what this does:
        // - It takes a new event from the grpc stream when one it available (see the await)
        // - Validate that we get values with if let (convert back from a result)
        // - For each updated event in the model, "yield" (forward) the event to the stream
        let event_stream = stream! {
            for await value in grpc_stream {
                if let Ok((_subscription_id, entity)) = value {
                    for model in entity.models {
                        yield RawToriiData::Grpc(model)
                    }
                }
            }
        };

        Ok(event_stream)
    }

    fn do_entities_sql_request(
        &self,
        r#where: impl Into<String>,
    ) -> Result<impl Stream<Item = RawToriiData>, Error> {
        let r#where = format!("m.namespace = 'ponzi_land' AND ({})", r#where.into());
        self.do_request(move |current_offset| {
            format!(r"
                SELECT concat( m.namespace, '-', m.name) as selector, e.data as data, e.event_id as event_id, e.created_at as created_at
                FROM entities_historical e
                LEFT JOIN models m on e.model_id = m.id
                WHERE {where}
                LIMIT 100 OFFSET {current_offset};
                ")
        })
    }

    fn do_events_sql_request(
        &self,
        r#where: impl Into<String>,
    ) -> Result<impl Stream<Item = RawToriiData>, Error> {
        let r#where = format!("m.namespace = 'ponzi_land' AND ({})", r#where.into());
        self.do_request(move |current_offset| {
            format!(r"
                SELECT concat(m.namespace, '-',  m.name) as selector, em.data as data, em.event_id as event_id, em.created_at as created_at
                FROM event_messages_historical em
                LEFT JOIN models m on em.model_id = m.id
                WHERE {where}
                ORDER BY length(em.event_id) ASC, em.event_id ASC
                LIMIT 100 OFFSET {current_offset};
                ")
        })
    }

    #[allow(clippy::unnecessary_wraps)] // This actually makes sense
    fn do_request<F, T>(&self, request: F) -> Result<impl Stream<Item = RawToriiData>, Error>
    where
        T: Into<String>,
        // We need a function that:
        // - can be send between threads (for the tokio::spawn)
        // - that lives for the entire duration of the program (easy if no internal state is used)
        // - Takes a u64 as a parameter, and returns something that can be .into() to a String (for move sementics purposes)
        F: 'static + Send + Fn(u64) -> T,
    {
        let sql_client = self.sql_client.clone();

        let (tx, rx) = mpsc::channel::<RawToriiData>(32);

        tokio::spawn(async move {
            let mut current_offset = 0;

            loop {
                // TODO(red): Add base offset support
                let request: Vec<QueryResponse> = sql_client
                    .query(request(current_offset).into())
                    .await
                    // TODO: Remove usage of panics
                    .expect("ohno");

                if request.is_empty() {
                    break;
                }

                current_offset += 100;

                // We can send data through the wire.
                for elem in request {
                    let event = RawToriiData::Json {
                        name: elem.selector,
                        data: elem.data,
                        event_id: elem.event_id,
                        // TODO: Migrate this to something else than panics
                        at: NaiveDateTime::parse_from_str(&elem.created_at, "%F %T")
                            .unwrap()
                            .and_utc(),
                    };
                    // TODO: Migrate this to something else than panics
                    tx.send(event).await.expect("Error");
                }
            }
        });

        Ok(ReceiverStream::new(rx))
    }
}

fn deserialize_nested_json<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    T: DeserializeOwned,
    D: serde::Deserializer<'de>,
{
    let json_string: String = String::deserialize(deserializer)?.replace("\\\"", "\"");
    serde_json::from_str::<T>(&json_string).map_err(serde::de::Error::custom)
}
