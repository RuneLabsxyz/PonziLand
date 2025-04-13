use ekubo::EkuboClient;
use starknet::{
    core::types::Felt,
    providers::{jsonrpc::HttpTransport, JsonRpcClient, Url},
};

#[tokio::main]
pub async fn main() {
    let client = JsonRpcClient::new(HttpTransport::new(
        Url::parse("https://api.cartridge.gg/x/starknet/sepolia").unwrap(),
    ));
    let client = EkuboClient::new(
        Felt::from_hex("0x0444a09d96389aa7148f1aada508e30b71299ffe650d9c97fdaae38cb9a23384")
            .unwrap(),
        &client,
    );

    let price = client
        .read_pool_price(ekubo::PoolKey {
            token0: Felt::from_hex_unchecked(
                "0x0335e87d03baaea788b8735ea0eac49406684081bb669535bb7074f9d3f66825", // This is ePAPER
            ),
            token1: Felt::from_hex_unchecked(
                "0x071de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0", // This is eSTRK
            ),
            fee: 3402823669209384634633746074317682114,
            tick_spacing: 19802,
            extension: Felt::ZERO,
        })
        .await
        .unwrap();

    println!("Pair ratio: 1 ePAPER = {} eSTRK", price);
    println!("Pair ratio: 1 eSTRK = {} ePAPER", price.inverse());
}
