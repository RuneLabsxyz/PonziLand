use ekubo::{contract::pool_price::PoolKey, EkuboClient};
use starknet::{
    core::types::Felt,
    providers::{jsonrpc::HttpTransport, JsonRpcClient, Url},
};

#[allow(non_snake_case, non_upper_case_globals)]
const ePAPER: Felt = Felt::from_hex_unchecked(
    "0x0335e87d03baaea788b8735ea0eac49406684081bb669535bb7074f9d3f66825", // This is ePAPER
);

#[allow(non_snake_case, non_upper_case_globals)]
const eSTRK: Felt = Felt::from_hex_unchecked(
    "0x071de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0", // This is eSTRK
);

#[tokio::main]
pub async fn main() {
    let client = JsonRpcClient::new(HttpTransport::new(
        Url::parse("https://api.cartridge.gg/x/starknet/sepolia").unwrap(),
    ));
    let client = EkuboClient::new(
        Felt::from_hex("0x0444a09d96389aa7148f1aada508e30b71299ffe650d9c97fdaae38cb9a23384")
            .unwrap(),
        &client,
        "https://starknet-sepolia-api.ekubo.org",
    );

    // Find the best pool for the pair
    let pools = client.get_pools(ePAPER, eSTRK).await.unwrap();

    println!("Found {} pools:", pools.len());
    for pool in &pools {
        println!(
            "- Pool ({}) => tvl(0): {}, tvl(1): {}",
            pool.key, pool.tvl0_total, pool.tvl1_total
        )
    }

    println!("=====================\n");

    if pools.len() == 0 {
        println!("No pools found");
        return;
    }

    let popular = &pools[0];

    println!("Using most popular pool: {}", &popular.key);

    let price = client.read_pool_price(&popular.key).await.unwrap();

    println!("Pair ratio: 1 ePAPER = {} eSTRK", price);
    println!("Pair ratio: 1 eSTRK = {} ePAPER", price.inverse());
}
