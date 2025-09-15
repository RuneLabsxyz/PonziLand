use async_trait::async_trait;
use price_provider::{PairRatio, PriceProvider};
use reqwest::{Client as ReqwestClient, Url};
use serde::Deserialize;
use starknet::core::types::Felt;
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Token not found: {0}")]
    TokenNotFound(String),
    #[error("Reference token not found: {0}")]
    ReferenceTokenNotFound(String),
    #[error("Invalid token address: {0}")]
    InvalidAddress(String),
    #[error("Price calculation failed: division by zero for reference token")]
    DivisionByZero,
    #[cfg(test)]
    #[error("JSON parsing failed: {0}")]
    JsonParse(String),
}

#[derive(Deserialize, Debug)]
struct TokenPriceDto {
    address: String,
    #[serde(rename = "priceInETH")]
    price_in_eth: f64,
    #[serde(rename = "priceInUSD")]
    #[allow(dead_code)]
    price_in_usd: f64,
    #[allow(dead_code)]
    decimals: i32,
}

/// AVNU Price Provider that fetches token prices from the AVNU API
pub struct AvnuPriceProvider {
    base_url: String,
    http_client: Arc<ReqwestClient>,
}

impl AvnuPriceProvider {
    /// Create a new AVNU price provider
    ///
    /// # Arguments
    /// * `base_url` - The base URL for the AVNU API
    ///   - Mainnet: "<https://starknet.impulse.avnu.fi>"
    ///   - Sepolia: "<https://sepolia.impulse.avnu.fi>"
    #[must_use]
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            http_client: Arc::new(ReqwestClient::new()),
        }
    }

    /// Fetch token prices from AVNU API with paging support (max 10 tokens per request)
    async fn fetch_avnu_prices(
        &self,
        token_addresses: Vec<String>,
    ) -> Result<Vec<TokenPriceDto>, Error> {
        const MAX_TOKENS_PER_REQUEST: usize = 10;
        let mut all_prices = Vec::new();

        // Split addresses into chunks of 10
        for chunk in token_addresses.chunks(MAX_TOKENS_PER_REQUEST) {
            let url = format!("{}/v1/tokens/prices", self.base_url);

            let mut url = Url::parse(&url).unwrap();
            {
                let pairs = &mut url.query_pairs_mut();
                pairs.extend_pairs(&chunk.iter().map(|addr| ("token", addr)).collect::<Vec<_>>());
            }

            println!("Address: {:?}", url.as_str());

            let response = self.http_client.get(url).send().await?;
            let chunk_prices: Vec<TokenPriceDto> = response.json().await?;
            all_prices.extend(chunk_prices);
        }

        Ok(all_prices)
    }

    /// Fetch token prices from AVNU API with debug logging and paging support (max 10 tokens per request)
    #[cfg(test)]
    async fn fetch_avnu_prices_debug(
        &self,
        token_addresses: Vec<String>,
    ) -> Result<Vec<TokenPriceDto>, Error> {
        const MAX_TOKENS_PER_REQUEST: usize = 10;
        let mut all_prices = Vec::new();

        println!("Making paged requests for {} tokens", token_addresses.len());

        // Split addresses into chunks of 10
        for (chunk_idx, chunk) in token_addresses.chunks(MAX_TOKENS_PER_REQUEST).enumerate() {
            let url = format!("{}/v1/tokens/prices", self.base_url);
            let query_params: Vec<_> = chunk.iter().map(|addr| ("token", addr)).collect();

            println!("Request {}: Making request to: {}", chunk_idx + 1, url);
            println!(
                "Request {}: Query params: {:?}",
                chunk_idx + 1,
                query_params
            );

            let response = self
                .http_client
                .get(&url)
                .query(&query_params)
                .send()
                .await?;

            let status = response.status();
            println!("Request {}: Response status: {}", chunk_idx + 1, status);

            let response_text = response.text().await?;
            println!(
                "Request {}: Response body: {}",
                chunk_idx + 1,
                response_text
            );

            let chunk_prices: Vec<TokenPriceDto> =
                serde_json::from_str(&response_text).map_err(|e| {
                    println!("Request {}: JSON parsing error: {}", chunk_idx + 1, e);
                    Error::JsonParse(format!("{e}"))
                })?;

            println!(
                "Request {}: Parsed {} token prices",
                chunk_idx + 1,
                chunk_prices.len()
            );
            for price in &chunk_prices {
                println!("  Token {}: {} ETH", price.address, price.price_in_eth);
            }

            all_prices.extend(chunk_prices);
        }

        println!(
            "Total parsed {} token prices across all requests",
            all_prices.len()
        );
        Ok(all_prices)
    }
}

/// Convert hex string to Felt, handling different formats
fn parse_token_address(address: &str) -> Result<Felt, Error> {
    Felt::from_hex(address).map_err(|_| Error::InvalidAddress(address.to_string()))
}

#[async_trait]
impl PriceProvider for AvnuPriceProvider {
    async fn get_price_of_pairs<T: IntoIterator<Item = String> + Send>(
        &self,
        reference_token_address: &str,
        tokens: T,
    ) -> Result<HashMap<Felt, PairRatio>, impl std::error::Error> {
        let token_addresses: Vec<String> = tokens.into_iter().collect();

        // Collect all unique token addresses (tokens + reference)
        let mut all_addresses = token_addresses.clone();
        if !all_addresses.contains(&reference_token_address.to_string()) {
            all_addresses.push(reference_token_address.to_string());
        }

        // Fetch prices from AVNU
        let prices = self.fetch_avnu_prices(all_addresses).await?;

        // Find reference token price (normalize addresses for comparison)
        let reference_price = prices
            .iter()
            .find(|p| {
                let normalized_api_addr = format!("0x{:0>64}", p.address.trim_start_matches("0x"));
                let normalized_ref_addr = format!(
                    "0x{:0>64}",
                    reference_token_address.trim_start_matches("0x")
                );
                normalized_api_addr.eq_ignore_ascii_case(&normalized_ref_addr)
            })
            .ok_or_else(|| Error::ReferenceTokenNotFound(reference_token_address.to_string()))?
            .price_in_eth;

        if reference_price == 0.0 {
            return Err(Error::DivisionByZero);
        }

        // Calculate ratios for requested tokens
        let mut result = HashMap::new();

        for token_address in token_addresses {
            let token_price = prices
                .iter()
                .find(|p| {
                    let normalized_api_addr =
                        format!("0x{:0>64}", p.address.trim_start_matches("0x"));
                    let normalized_token_addr =
                        format!("0x{:0>64}", token_address.trim_start_matches("0x"));
                    normalized_api_addr.eq_ignore_ascii_case(&normalized_token_addr)
                })
                .ok_or_else(|| Error::TokenNotFound(token_address.clone()))?;

            let ratio = token_price.price_in_eth / reference_price;
            let felt_address = parse_token_address(&token_address)?;
            result.insert(felt_address, PairRatio(ratio.into()));
        }

        Ok(result)
    }
}

#[cfg(test)]
#[allow(clippy::unreadable_literal)]
mod tests {
    use super::*;
    use mockito::{Matcher, Server};
    use serde_json::json;

    #[test]
    fn test_provider_creation() {
        let provider = AvnuPriceProvider::new("https://starknet.impulse.avnu.fi".to_string());
        assert_eq!(provider.base_url, "https://starknet.impulse.avnu.fi");
    }

    #[test]
    fn test_parse_token_address() {
        // Test valid hex address
        let result = parse_token_address(
            "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
        );
        assert!(result.is_ok());

        // Test invalid address
        let result = parse_token_address("invalid_address");
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_avnu_api_format_and_pair_ratio_parsing() {
        let mut server = Server::new_async().await;

        // Mock AVNU API response with realistic token data
        let mock_response = json!([
            {
                "address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                "priceInETH": 1.0,
                "priceInUSD": 2400.0,
                "decimals": 18
            },
            {
                "address": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
                "priceInETH": 0.000_416_6,
                "priceInUSD": 1.0,
                "decimals": 6
            },
            {
                "address": "0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49",
                "priceInETH": 2.5,
                "priceInUSD": 6000.0,
                "decimals": 18
            }
        ]);

        let _mock = server
            .mock("GET", "/v1/tokens/prices")
            .match_query(Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(mock_response.to_string())
            .create_async()
            .await;

        let provider = AvnuPriceProvider::new(server.url());

        let reference_token = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"; // ETH
        let tokens = vec![
            "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d".to_string(), // USDC
            "0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49".to_string(), // Some other token
        ];

        let result = provider.get_price_of_pairs(reference_token, tokens).await;

        assert!(
            result.is_ok(),
            "Failed to get price pairs: {:?}",
            result.err()
        );
        let price_map = result.unwrap();

        // Verify we got both tokens
        assert_eq!(price_map.len(), 2, "Expected 2 token prices");

        // Verify USDC ratio (0.0004166 ETH / 1.0 ETH = 0.0004166)
        let usdc_felt = parse_token_address(
            "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
        )
        .unwrap();
        let usdc_ratio = price_map.get(&usdc_felt).unwrap();

        // Check that the ratio is approximately correct (allowing for floating point precision)
        let expected_usdc_ratio = 0.0004166;
        let actual_usdc_ratio: f64 = usdc_ratio.0.into();
        assert!(
            (actual_usdc_ratio - expected_usdc_ratio).abs() < 0.0000001,
            "USDC ratio mismatch: expected ~{expected_usdc_ratio}, got {actual_usdc_ratio}",
        );

        // Verify other token ratio (2.5 ETH / 1.0 ETH = 2.5)
        let other_felt = parse_token_address(
            "0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49",
        )
        .unwrap();
        let other_ratio = price_map.get(&other_felt).unwrap();

        let expected_other_ratio = 2.5;
        let actual_other_ratio: f64 = other_ratio.0.into();
        assert!(
            (actual_other_ratio - expected_other_ratio).abs() < 0.00001,
            "Other token ratio mismatch: expected {expected_other_ratio}, got {actual_other_ratio}"
        );
    }

    #[tokio::test]
    async fn test_reference_token_not_found() {
        let mut server = Server::new_async().await;

        let mock_response = json!([
            {
                "address": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
                "priceInETH": 0.000_416_6,
                "priceInUSD": 1.0,
                "decimals": 6
            }
        ]);

        let _mock = server
            .mock("GET", "/v1/tokens/prices")
            .match_query(Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(mock_response.to_string())
            .create_async()
            .await;

        let provider = AvnuPriceProvider::new(server.url());

        let reference_token = "0x999999570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"; // Non-existent
        let tokens =
            vec!["0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d".to_string()];

        let result = provider.get_price_of_pairs(reference_token, tokens).await;

        assert!(result.is_err());
        let error_msg = format!("{}", result.err().unwrap());
        assert!(
            error_msg.contains("Reference token not found"),
            "Expected ReferenceTokenNotFound error, got: {error_msg}",
        );
    }

    #[tokio::test]
    async fn test_token_not_found() {
        let mut server = Server::new_async().await;

        let mock_response = json!([
            {
                "address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                "priceInETH": 1.0,
                "priceInUSD": 2400.0,
                "decimals": 18
            }
        ]);

        let _mock = server
            .mock("GET", "/v1/tokens/prices")
            .match_query(Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(mock_response.to_string())
            .create_async()
            .await;

        let provider = AvnuPriceProvider::new(server.url());

        let reference_token = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
        let tokens = vec![
            "0x999999570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7".to_string(), // Non-existent
        ];

        let result = provider.get_price_of_pairs(reference_token, tokens).await;

        assert!(result.is_err());
        let error_msg = format!("{}", result.err().unwrap());
        assert!(
            error_msg.contains("Token not found"),
            "Expected TokenNotFound error, got: {error_msg}"
        );
    }

    #[tokio::test]
    async fn test_division_by_zero() {
        let mut server = Server::new_async().await;

        let mock_response = json!([
            {
                "address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                "priceInETH": 0.0, // Zero price for reference token
                "priceInUSD": 0.0,
                "decimals": 18
            },
            {
                "address": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
                "priceInETH": 0.0004166,
                "priceInUSD": 1.0,
                "decimals": 6
            }
        ]);

        let _mock = server
            .mock("GET", "/v1/tokens/prices")
            .match_query(Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(mock_response.to_string())
            .create_async()
            .await;

        let provider = AvnuPriceProvider::new(server.url());

        let reference_token = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
        let tokens =
            vec!["0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d".to_string()];

        let result = provider.get_price_of_pairs(reference_token, tokens).await;

        assert!(result.is_err());
        let error_msg = format!("{}", result.err().unwrap());
        assert!(
            error_msg.contains("division by zero"),
            "Expected DivisionByZero error, got: {error_msg}",
        );
    }

    #[tokio::test]
    #[allow(clippy::similar_names)]
    async fn test_paging_with_many_tokens() {
        let mut server = Server::new_async().await;

        // Create mock responses for multiple requests
        let mock_response_1 = json!([
            {"address": "0x001", "priceInETH": 1.0, "priceInUSD": 2400.0, "decimals": 18},
            {"address": "0x002", "priceInETH": 2.0, "priceInUSD": 4800.0, "decimals": 18},
            {"address": "0x003", "priceInETH": 3.0, "priceInUSD": 7200.0, "decimals": 18},
            {"address": "0x004", "priceInETH": 4.0, "priceInUSD": 9600.0, "decimals": 18},
            {"address": "0x005", "priceInETH": 5.0, "priceInUSD": 12000.0, "decimals": 18},
            {"address": "0x006", "priceInETH": 6.0, "priceInUSD": 14400.0, "decimals": 18},
            {"address": "0x007", "priceInETH": 7.0, "priceInUSD": 16800.0, "decimals": 18},
            {"address": "0x008", "priceInETH": 8.0, "priceInUSD": 19200.0, "decimals": 18},
            {"address": "0x009", "priceInETH": 9.0, "priceInUSD": 21600.0, "decimals": 18},
            {"address": "0x00a", "priceInETH": 10.0, "priceInUSD": 24000.0, "decimals": 18}
        ]);

        let mock_response_2 = json!([
            {"address": "0x00b", "priceInETH": 11.0, "priceInUSD": 26400.0, "decimals": 18},
            {"address": "0x00c", "priceInETH": 12.0, "priceInUSD": 28800.0, "decimals": 18},
            {"address": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", "priceInETH": 1.0, "priceInUSD": 2400.0, "decimals": 18}
        ]);

        // Mock first request (tokens 1-10)
        let _mock1 = server
            .mock("GET", "/v1/tokens/prices")
            .match_query(Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(mock_response_1.to_string())
            .create_async()
            .await;

        // Mock second request (tokens 11-12 + reference)
        let _mock2 = server
            .mock("GET", "/v1/tokens/prices")
            .match_query(Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(mock_response_2.to_string())
            .create_async()
            .await;

        let provider = AvnuPriceProvider::new(server.url());

        // Test with 12 tokens (should trigger 2 requests: 10 + 2 tokens + reference)
        let reference_token = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
        let tokens = vec![
            "0x001".to_string(),
            "0x002".to_string(),
            "0x003".to_string(),
            "0x004".to_string(),
            "0x005".to_string(),
            "0x006".to_string(),
            "0x007".to_string(),
            "0x008".to_string(),
            "0x009".to_string(),
            "0x00a".to_string(),
            "0x00b".to_string(),
            "0x00c".to_string(),
        ];

        let result = provider
            .get_price_of_pairs(reference_token, tokens.clone())
            .await;

        assert!(result.is_ok(), "Should handle paged requests successfully");
        let price_map = result.unwrap();

        // Should have prices for all 12 tokens
        assert_eq!(price_map.len(), 12, "Should have 12 token prices");

        // Verify some token ratios
        let token_001_felt = parse_token_address("0x001").unwrap();
        let token_001_ratio = price_map.get(&token_001_felt).unwrap();
        let actual_ratio: f64 = token_001_ratio.0.into();
        assert!(
            (actual_ratio - 1.0).abs() < 0.00001,
            "Token 0x001 ratio should be 1.0"
        );

        let token_00c_felt = parse_token_address("0x00c").unwrap();
        let token_00c_ratio = price_map.get(&token_00c_felt).unwrap();
        let actual_ratio: f64 = token_00c_ratio.0.into();
        assert!(
            (actual_ratio - 12.0).abs() < 0.00001,
            "Token 0x00c ratio should be 12.0"
        );
    }

    #[tokio::test]
    #[ignore = "Real integration test - requires network access"]
    async fn test_real_avnu_api_integration() {
        let provider = AvnuPriceProvider::new("https://starknet.impulse.avnu.fi".to_string());

        let reference_token = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"; // STRK

        // First try to get detailed debug info by calling the API directly
        let all_addresses = vec![
            "0x49201f03a0f0a9e70e28dcd74cbf44931174dbe3cc4b2ff488898339959e559".to_string(), // PAL
            "0x781bddf077f25a53411d567093f63f9a839ec9e6bc4d99d9240cf742b98b0e8".to_string(), // BONK
            "0x040E81cfeB176BFDbc5047BBC55eb471CFAb20a6B221f38d8fDa134E1bFFFca4".to_string(), // DOG
            reference_token.to_string(),                                                     // STRK
        ];

        println!("Testing direct API call with debug info...");
        match provider
            .fetch_avnu_prices_debug(all_addresses.clone())
            .await
        {
            Ok(prices) => println!("Direct API call succeeded with {} prices", prices.len()),
            Err(e) => println!("Direct API call failed: {e}"),
        }

        let tokens = vec![
            "0x49201f03a0f0a9e70e28dcd74cbf44931174dbe3cc4b2ff488898339959e559".to_string(), // PAL
            "0x781bddf077f25a53411d567093f63f9a839ec9e6bc4d99d9240cf742b98b0e8".to_string(), // BONK
            "0x040E81cfeB176BFDbc5047BBC55eb471CFAb20a6B221f38d8fDa134E1bFFFca4".to_string(), // DOG
        ];

        let result = provider.get_price_of_pairs(reference_token, tokens).await;

        match result {
            Ok(price_map) => {
                println!("Successfully fetched prices for {} tokens", price_map.len());

                // Verify we got prices for the requested tokens
                let pal_felt = parse_token_address(
                    "0x49201f03a0f0a9e70e28dcd74cbf44931174dbe3cc4b2ff488898339959e559",
                )
                .unwrap();
                let bonk_felt = parse_token_address(
                    "0x781bddf077f25a53411d567093f63f9a839ec9e6bc4d99d9240cf742b98b0e8",
                )
                .unwrap();
                let dog_felt = parse_token_address(
                    "0x040E81cfeB176BFDbc5047BBC55eb471CFAb20a6B221f38d8fDa134E1bFFFca4",
                )
                .unwrap();

                if let Some(pal_ratio) = price_map.get(&pal_felt) {
                    let pal_price: f64 = pal_ratio.0.into();
                    println!("PAL/STRK ratio: {}", pal_price);
                    assert!(pal_price > 0.0, "PAL price should be positive");
                }

                if let Some(bonk_ratio) = price_map.get(&bonk_felt) {
                    let bonk_price: f64 = bonk_ratio.0.into();
                    println!("BONK/STRK ratio: {}", bonk_price);
                    assert!(bonk_price > 0.0, "BONK price should be positive");
                }

                if let Some(dog_ratio) = price_map.get(&dog_felt) {
                    let dog_price: f64 = dog_ratio.0.into();
                    println!("DOG/STRK ratio: {}", dog_price);
                    assert!(dog_price > 0.0, "DOG price should be positive");
                }

                // Verify that PairRatio conversion works correctly
                for (token_felt, ratio) in &price_map {
                    let price_f64: f64 = ratio.0.into();
                    println!("Token {:x}: ratio = {}", token_felt, price_f64);

                    // Basic sanity checks
                    assert!(price_f64.is_finite(), "Price should be finite");
                    assert!(price_f64 >= 0.0, "Price should be non-negative");
                }
            }
            Err(e) => {
                println!("API call failed (this may be expected if tokens are not available): {e}");
                // Don't fail the test if some tokens are not found, as this might be expected
                // Only fail if it's a more serious error
                let error_msg = format!("{e}");
                if !error_msg.contains("Token not found")
                    && !error_msg.contains("Reference token not found")
                {
                    panic!("Unexpected error: {e}");
                }
            }
        }
    }
}
