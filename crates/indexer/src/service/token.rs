use crate::config::{Conf, Token};

pub struct TokenService {
    pub tokens: Vec<Token>,
    pub main_token: Token,
}

impl TokenService {
    pub fn new(config: &Conf) -> Self {
        let main_token = config
            .token
            .iter()
            .find(|e| e.symbol == config.default_token)
            .expect("default token is not present in token definitions!");

        TokenService {
            tokens: config.token.clone(),
            main_token: main_token.clone(),
        }
    }

    pub fn list(&self) -> Vec<Token> {
        self.tokens.clone()
    }

    pub fn main_token(&self) -> &Token {
        &self.main_token
    }
}
