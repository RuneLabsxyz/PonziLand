use starknet::core::types::Felt;
use tokio_stream::StreamExt;
use torii_ingester::{ToriiClient, ToriiConfiguration};

use tracing::Level;
#[tokio::main]
pub async fn main() {
    tracing_subscriber::fmt::fmt()
        .with_max_level(Level::INFO)
        .init();

    let client = ToriiClient::new(&ToriiConfiguration {
        base_url: "http://localhost:8080".into(),
        world_address: Felt::from_hex_unchecked(
            "0x7089c97c3b8232269422eedf87cc71448505df141c220433a6bec48773a8881",
        ),
    })
    .await
    .expect("Failed to initialize client");

    // try to fetch every event
    let mut event_stream = client
        .get_all_events()
        .await
        .expect("Failed to fetch events");

    while let Some(event) = event_stream.next().await {
        println!("{:?}", event);
    }
}
