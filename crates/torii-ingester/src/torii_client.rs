use crate::torii_sql::SqlClient;
use async_stream::stream;
use dojo_types::schema::Struct;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use starknet::core::types::Felt;
use thiserror::Error;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::Stream;
use torii_client::client::Client as GrpcClient;

// TODO(Red): Make sure we loose no messages between the catchup and the listen
// (Maybe add the listen at the same time we do the catchup, and if we keep the event IDs somewhere, we can work with this system)

#[derive(Error, Debug)]
pub enum Error {
    #[error("Error while starting torii: {0}")]
    ToriiInitializationError(torii_client::client::error::Error),
    #[error("Error while setting up subscription: {0}")]
    GrpcSubscriptionError(torii_client::client::error::Error),
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
pub enum RawEvent {
    Json { name: String, data: Value },
    Grpc(Struct),
}

impl ToriiClient {
    pub async fn new(config: &ToriiConfiguration) -> Result<Self, Error> {
        let relay_url = "".into();
        let grpc_client = GrpcClient::new(config.base_url.clone(), relay_url, config.world_address)
            .await
            .map_err(Error::ToriiInitializationError)?;

        let sql_client = SqlClient::new(config.base_url.clone())?;

        Ok(Self {
            grpc_client,
            sql_client,
        })
    }

    pub async fn get_all_events(&self) -> Result<impl Stream<Item = RawEvent>, Error> {
        #[derive(Serialize, Deserialize, Debug)]
        struct QueryResponse {
            selector: String,
            #[serde(deserialize_with = "deserialize_nested_json")]
            data: Value,
            event_id: String,
            // TODO(red): MIgrate this to a datetime dependency like chrono
            created_at: String,
        }

        let sql_client = self.sql_client.clone();

        let (tx, rx) = mpsc::channel::<RawEvent>(32);

        tokio::spawn(async move {
            let mut current_offset = 0;

            loop {
                // TODO(red): Add base offset support
                let request: Vec<QueryResponse> = sql_client.query(format!(r#"
                    SELECT concat(m.namespace, '-',  m.name) as selector, em.data as data, em.event_id as event_id, em.created_at as created_at
                    FROM event_messages_historical em
                    LEFT JOIN models m on em.model_id = m.id
                    LIMIT 100 OFFSET {current_offset};
                    "#))
                .await
                // TODO: Remove usage of panics
                .expect("ohno");

                if request.is_empty() {
                    break;
                } else {
                    current_offset += 100;
                }

                // We can send data through the wire.
                for elem in request {
                    let event = RawEvent::Json {
                        name: elem.selector,
                        data: elem.data,
                    };
                    // TODO: Migrate this to something else than panics
                    tx.send(event).await.expect("Error");
                }
            }
        });

        Ok(ReceiverStream::new(rx))
    }

    pub async fn subscribe_events(&self) -> Result<impl Stream<Item = RawEvent>, Error> {
        let grpc_stream = self
            .grpc_client
            .on_event_message_updated(vec![])
            .await
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
                        yield RawEvent::Grpc(model)
                    }
                }
            }
        };

        // Join the two streams (one with the backdated events, then the newer ones)

        Ok(event_stream)
    }
}

fn deserialize_nested_json<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    T: DeserializeOwned,
    D: serde::Deserializer<'de>,
{
    let json_string: String = String::deserialize(deserializer)?;
    serde_json::from_str::<T>(&json_string).map_err(serde::de::Error::custom)
}
