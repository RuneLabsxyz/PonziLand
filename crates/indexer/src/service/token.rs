use anyhow::{anyhow, Result};

use crate::config::{Conf, Token};

pub struct TokenService {
    pub tokens: Vec<Token>,
    pub main_token: Token,
}

impl TokenService {
    pub fn new(config: &Conf) -> Result<Self> {
        let main_token = config
            .token
            .iter()
            .find(|e| e.symbol == config.default_token)
            .ok_or_else(|| anyhow!("Impossible to find token!"))?;

        Ok(TokenService {
            tokens: config.token.clone(),
            main_token: main_token.clone(),
        })
    }

    #[must_use]
    pub fn list(&self) -> Vec<Token> {
        self.tokens.clone()
    }

    #[must_use]
    pub fn main_token(&self) -> &Token {
        &self.main_token
    }

    /// Get decimals for a token by its normalized address.
    /// Returns 18 (default) if the token is not found.
    #[must_use]
    pub fn get_decimals(&self, normalized_address: &str) -> u32 {
        self.tokens
            .iter()
            .find(|t| {
                let token_addr = t.address.to_fixed_hex_string();
                token_addr.eq_ignore_ascii_case(normalized_address)
            })
            .map_or(18, |t| t.decimals)
    }
}
