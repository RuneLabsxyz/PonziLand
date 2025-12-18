/// Normalize a token address to padded format (0x + 64 hex chars)
///
/// Starknet addresses should be 64 hex characters (256 bits) after the 0x prefix.
/// This function ensures addresses are properly padded with leading zeros.
#[must_use]
pub fn normalize_token_address(address: &str) -> String {
    let stripped = address.strip_prefix("0x").unwrap_or(address);
    format!("0x{stripped:0>64}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_already_padded() {
        let addr = "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
        assert_eq!(normalize_token_address(addr), addr);
    }

    #[test]
    fn test_normalize_short_address() {
        let addr = "0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
        let expected = "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
        assert_eq!(normalize_token_address(addr), expected);
    }

    #[test]
    fn test_normalize_without_prefix() {
        let addr = "53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
        let expected = "0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
        assert_eq!(normalize_token_address(addr), expected);
    }
}
